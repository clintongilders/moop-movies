const { spawn } = require("node:child_process");
const path = require("node:path");
const net = require("node:net");

const root = path.resolve(__dirname, "..");
const children = [];
let stopping = false;

function signalChild(child, signal) {
  if (!child.pid) return;
  try {
    // Include subprocesses started by the development server.
    if (process.platform === "win32") child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") console.error(error.message);
  }
}

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  children.forEach((child) => signalChild(child, "SIGTERM"));
  const timeout = setTimeout(() => {
    children.forEach((child) => signalChild(child, "SIGKILL"));
  }, 5000);
  timeout.unref();
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

async function start() {
  const occupied = [];
  for (const port of [3000, 3001]) {
    const available = await new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.once("error", (error) => {
        if (error.code === "EADDRINUSE") resolve(false);
        else reject(error);
      });
      probe.listen(port, "0.0.0.0", () => probe.close(() => resolve(true)));
    });
    if (!available) occupied.push(port);
  }
  if (occupied.length) {
    console.error(
      `Development port(s) ${occupied.join(", ")} already in use. Stop the existing services, then run npm run dev again.`,
    );
    console.error(
      "On macOS, identify them with: lsof -nP -iTCP:3000 -iTCP:3001 -sTCP:LISTEN",
    );
    process.exitCode = 1;
    return;
  }
  for (const [name, script] of [
    ["API", path.join(root, "server/index.cjs")],
    ["React", path.join(root, "node_modules/vite/bin/vite.js")],
  ]) {
    console.log(`Starting ${name} development service...`);
    const child = spawn(
      process.execPath,
      [script, ...(name === "React" ? ["--port", "3000", "--strictPort"] : [])],
      {
        cwd: root,
        stdio: "inherit",
        detached: process.platform !== "win32",
        env: { ...process.env, NODE_ENV: "development" },
      },
    );
    children.push(child);
    child.on("error", (error) => {
      console.error(`${name} failed to start: ${error.message}`);
      stop(1);
    });
    child.on("exit", (code, signal) => {
      if (stopping) return;
      console.error(
        `${name} stopped (${signal || code}); stopping both services.`,
      );
      stop(code || 1);
    });
  }
}

start().catch((error) => {
  console.error(`Unable to start development services: ${error.message}`);
  stop(1);
});
