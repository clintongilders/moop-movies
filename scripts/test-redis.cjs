const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const { createSessionStore } = require("../server/session-store.cjs");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "moop-redis-test-"));
const name = `moop-redis-test-${process.pid}`;
const docker = (...args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const waitFor = async (predicate) => {
  const deadline = Date.now() + 45000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Redis recovery timed out");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};
const call = (store, method, ...args) =>
  new Promise((resolve, reject) =>
    store[method](...args, (error, result) =>
      error ? reject(error) : resolve(result),
    ),
  );
(async () => {
  let session;
  try {
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        path.join(dir, "key.pem"),
        "-out",
        path.join(dir, "cert.pem"),
        "-days",
        "1",
        "-subj",
        "/CN=localhost",
        "-addext",
        "subjectAltName=IP:127.0.0.1,DNS:localhost",
      ],
      { stdio: "ignore" },
    );
    // Disposable test certificates must be readable by the container Redis user.
    fs.chmodSync(dir, 0o755);
    fs.chmodSync(path.join(dir, "key.pem"), 0o644);
    const probe = require("node:net").createServer();
    await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
    const fixedPort = probe.address().port;
    await new Promise((resolve) => probe.close(resolve));
    docker(
      "create",
      "--name",
      name,
      "-p",
      `127.0.0.1:${fixedPort}:6379`,
      "redis:7-alpine",
      "redis-server",
      "--port",
      "0",
      "--tls-port",
      "6379",
      "--tls-cert-file",
      "/certs/cert.pem",
      "--tls-key-file",
      "/certs/key.pem",
      "--tls-ca-cert-file",
      "/certs/cert.pem",
      "--tls-auth-clients",
      "no",
      "--save",
      "",
      "--appendonly",
      "no",
    );
    // Copy fixtures rather than depending on host bind-mount ownership or paths.
    docker("cp", dir, `${name}:/certs`);
    docker("start", name);
    session = await createSessionStore({
      secret: "fixture-secret",
      redisUrl: `rediss://127.0.0.1:${fixedPort}`,
      redisCa: fs.readFileSync(path.join(dir, "cert.pem")),
      production: true,
    });
    const data = {
      cookie: { expires: new Date(Date.now() + 60000) },
      tmdbSession: "private-tmdb-session",
    };
    await call(session.store, "set", "fixture", data);
    assert.equal(
      (await call(session.store, "get", "fixture")).tmdbSession,
      data.tmdbSession,
    );
    const raw = docker(
      "exec",
      name,
      "redis-cli",
      "--tls",
      "--cacert",
      "/certs/cert.pem",
      "GET",
      "moop:session:fixture",
    );
    assert.ok(raw.length > 0 && !raw.includes(data.tmdbSession));
    docker("stop", name);
    await waitFor(() => !session.healthy());
    await assert.rejects(call(session.store, "get", "fixture"));
    docker("start", name);
    await waitFor(session.healthy);
    await call(session.store, "set", "recovered", data);
    assert.equal(
      (await call(session.store, "get", "recovered")).tmdbSession,
      data.tmdbSession,
    );
    await call(session.store, "destroy", "recovered");
    assert.equal(await call(session.store, "get", "recovered"), null);
    console.log(
      "Redis TLS encryption, outage, reconnect, and session deletion passed.",
    );
  } catch (error) {
    try {
      console.error(docker("logs", name));
    } catch {}
    throw error;
  } finally {
    if (session) await session.close();
    try {
      docker("rm", "-f", name);
    } catch {}
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
