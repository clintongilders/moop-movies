const { test } = require("node:test");
const assert = require("node:assert/strict");
const session = require("express-session");
const { createApp } = require("./app.cjs");

async function browser(app) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const jar = new Map();
  return {
    async request(path, options = {}) {
      const response = await fetch(base + path, {
        redirect: "manual",
        ...options,
        headers: {
          Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; "),
          ...options.headers,
        },
      });
      for (const raw of response.headers.getSetCookie()) {
        const pair = raw.split(";")[0];
        const position = pair.indexOf("=");
        jar.set(pair.slice(0, position), pair.slice(position + 1));
      }
      return response;
    },
    close: async () => {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

test("anonymous account checks issue stateless CSRF tokens without storing sessions", async () => {
  const store = new session.MemoryStore();
  let writes = 0;
  const set = store.set.bind(store);
  store.set = (...args) => {
    writes++;
    return set(...args);
  };
  const client = await browser(
    createApp({
      token: "secret",
      sessionSecret: "test-secret",
      sessionStore: store,
    }),
  );
  try {
    const response = await client.request("/api/auth/me");
    const auth = await response.json();
    assert.ok(auth.csrf);
    assert.equal(auth.account, null);
    assert.equal(writes, 0);
    assert.ok(!response.headers.get("set-cookie").includes("moop.sid"));
    const invalid = await client.request("/api/auth/start", {
      method: "POST",
      headers: { "X-CSRF-Token": auth.csrf + "tampered" },
    });
    assert.equal(invalid.status, 403);
    assert.equal(writes, 0);
  } finally {
    await client.close();
  }
});

for (const failure of ["revoked", "logout"])
  test(`${failure} clears local authentication despite upstream failure`, async () => {
    let failed = false;
    let revokeAttempts = 0;
    const client = await browser(
      createApp({
        token: "secret",
        sessionSecret: "test-secret",
        fetchImpl: async (url, options) => {
          const path = new URL(url).pathname;
          if (options.method === "DELETE") revokeAttempts++;
          if (
            (failure === "revoked" &&
              failed &&
              path.includes("/account_states")) ||
            (failure === "logout" && options.method === "DELETE")
          )
            return { ok: false, status: failure === "revoked" ? 401 : 503 };
          const data = path.endsWith("/token/new")
            ? { request_token: "request" }
            : path.endsWith("/session/new")
              ? { session_id: "session" }
              : path === "/3/account"
                ? { id: 7, username: "tester" }
                : { success: true };
          return { ok: true, json: async () => data };
        },
      }),
    );
    try {
      const { csrf } = await (await client.request("/api/auth/me")).json();
      const start = await (
        await client.request("/api/auth/start", {
          method: "POST",
          headers: { "X-CSRF-Token": csrf },
        })
      ).json();
      const callback = new URL(
        new URL(start.url).searchParams.get("redirect_to"),
      );
      await client.request(
        `${callback.pathname}${callback.search}&request_token=request&approved=true`,
      );
      assert.equal(
        (await (await client.request("/api/auth/me")).json()).account.id,
        7,
      );
      failed = true;
      const response =
        failure === "revoked"
          ? await client.request("/api/account/states/movie/1")
          : await client.request("/api/auth/logout", {
              method: "POST",
              headers: { "X-CSRF-Token": csrf },
            });
      assert.equal(response.status, failure === "revoked" ? 401 : 200);
      assert.equal(
        (await (await client.request("/api/auth/me")).json()).account,
        null,
      );
      if (failure === "logout") {
        await new Promise((resolve) => setTimeout(resolve, 350));
        assert.equal(revokeAttempts, 2);
      }
    } finally {
      await client.close();
    }
  });
