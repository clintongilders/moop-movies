const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("./app.cjs");

test("proxy validates inputs, keeps credentials server-side, and sanitizes failures", async () => {
  const calls = [];
  const app = createApp({
    token: "test-secret",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/watch/providers"))
        return {
          ok: true,
          json: async () => ({
            results: {
              CA: { flatrate: [{ provider_id: 8, provider_name: "Netflix" }] },
            },
          }),
        };
      if (url.includes("/movie/99?"))
        throw new Error("private upstream information");
      return { ok: true, json: async () => ({ results: [{ id: 1 }] }) };
    },
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(
      `${base}/api/movies?page=2&with_genres=28%7C12`,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { results: [{ id: 1 }] });
    assert.equal(calls[0].options.headers.Authorization, "Bearer test-secret");
    assert.equal(new URL(calls[0].url).searchParams.get("page"), "2");
    assert.equal(
      new URL(calls[0].url).searchParams.get("with_genres"),
      "28|12",
    );
    for (const query of [
      "page=0",
      "page=501",
      "page=1&page=2",
      "with_genres=bad",
      "url=https://example.com",
    ]) {
      assert.equal((await fetch(`${base}/api/movies?${query}`)).status, 400);
    }
    assert.equal(new URL(calls[0].url).searchParams.get("watch_region"), "CA");
    assert.equal(
      new URL(calls[0].url).searchParams.get("with_watch_monetization_types"),
      "flatrate|free|ads|rent|buy",
    );
    assert.equal(calls.length, 1);
    const tv = await fetch(`${base}/api/tv?page=3&with_genres=18,35`);
    assert.equal(tv.status, 200);
    const tvUrl = new URL(calls[1].url);
    assert.equal(tvUrl.pathname, "/3/discover/tv");
    assert.equal(tvUrl.searchParams.get("page"), "3");
    assert.equal(tvUrl.searchParams.get("with_genres"), "18,35");
    assert.equal(tvUrl.searchParams.has("include_video"), false);
    assert.equal((await fetch(`${base}/api/tv?page=0`)).status, 400);

    assert.equal((await fetch(`${base}/api/tmdb/account`)).status, 404);
    for (const path of [
      "genre/movie/list",
      "trending/tv/day",
      "movie/1",
      "tv/1/videos",
      "movie/1/watch/providers",
    ]) {
      assert.equal((await fetch(`${base}/api/tmdb/${path}`)).status, 200);
    }
    const failure = await fetch(`${base}/api/tmdb/movie/99`);
    assert.equal(failure.status, 502);
    assert.deepEqual(await failure.json(), {
      error: "Movie service unavailable",
    });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("movie and TV listings omit missing Canadian availability and excluded channels", async () => {
  const app = createApp({
    token: "test-secret",
    fetchImpl: async (url) => {
      const id = url.match(/(?:movie|tv)\/(\d+)\/watch/)?.[1];
      const availability = {
        1: { CA: { rent: [{ provider_id: 2, provider_name: "Apple TV" }] } },
        2: { US: { flatrate: [{ provider_id: 8, provider_name: "Netflix" }] } },
        3: {
          CA: {
            flatrate: [
              {
                provider_id: 999,
                provider_name: "Paramount Plus Apple TV Channel",
              },
            ],
          },
        },
        4: {
          CA: { flatrate: [{ provider_id: 582, provider_name: "Excluded" }] },
        },
        5: {
          CA: { free: [{ provider_id: 100, provider_name: "Free provider" }] },
        },
      };
      return {
        ok: true,
        json: async () => ({
          results: id
            ? availability[id]
            : [1, 2, 3, 4, 5].map((id) => ({ id })),
        }),
      };
    },
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    for (const path of [
      "/api/tmdb/trending/movie/day",
      "/api/tmdb/trending/tv/day",
    ]) {
      const response = await fetch(
        `http://127.0.0.1:${server.address().port}${path}`,
      );
      assert.equal(response.status, 200);
      assert.deepEqual(
        (await response.json()).results.map((item) => item.id),
        [1, 5],
      );
    }
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("search validates and encodes queries, removes people, and checks Canadian availability", async () => {
  const calls = [];
  const app = createApp({
    token: "test",
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        ok: true,
        json: async () =>
          url.includes("/watch/providers")
            ? {
                results: url.includes("/movie/")
                  ? { CA: { rent: [{ provider_id: 2 }] } }
                  : {},
              }
            : {
                total_pages: 2,
                results: [
                  { id: 1, media_type: "movie" },
                  { id: 2, media_type: "tv" },
                  { id: 3, media_type: "person" },
                ],
              },
      };
    },
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const query of [
      "",
      "?query=%20",
      "?query=a&query=b",
      "?query=a&page=0",
    ]) {
      assert.equal((await fetch(`${base}/api/search${query}`)).status, 400);
    }
    assert.equal(calls.length, 0);
    const response = await fetch(
      `${base}/api/search?query=${encodeURIComponent("Law & Order")}&page=2`,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      total_pages: 2,
      results: [{ id: 1, media_type: "movie" }],
    });
    const upstream = new URL(calls[0]);
    assert.equal(upstream.pathname, "/3/search/multi");
    assert.equal(upstream.searchParams.get("query"), "Law & Order");
    assert.equal(upstream.searchParams.get("page"), "2");
    assert.equal(upstream.searchParams.get("include_adult"), "false");
    assert.equal(calls.length, 3);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("production hosting serves SPA routes but preserves API 404s", async () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const dir = fs.mkdtempSync(
    path.join(require("node:os").tmpdir(), "moop-static-"),
  );
  fs.writeFileSync(path.join(dir, "index.html"), "<html>MOOP test app</html>");
  const app = createApp({ token: "test", staticDir: dir });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ["/", "/movie/42", "/account"]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /MOOP test app/);
    }
    assert.equal((await fetch(base + "/api/missing")).status, 404);
    assert.deepEqual(await (await fetch(base + "/healthz")).json(), {
      status: "ok",
    });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    fs.unlinkSync(path.join(dir, "index.html"));
    fs.rmdirSync(dir);
  }
});

test("discover avoids fan-out, provider errors fail softly, and public failures retain status", async () => {
  const calls = [];
  const app = createApp({
    token: "secret",
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.includes("/watch/providers?")) return { ok: false, status: 429 };
      if (url.includes("/movie/999?")) return { ok: false, status: 404 };
      return {
        ok: true,
        json: async () => ({ results: [{ id: 1 }], total_pages: 1 }),
      };
    },
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fetch(base + "/api/movies");
    await fetch(base + "/api/movies");
    assert.equal(calls.length, 1);
    const trending = await fetch(base + "/api/tmdb/trending/movie/day");
    assert.deepEqual((await trending.json()).results, [{ id: 1 }]);
    const missing = await fetch(base + "/api/tmdb/movie/999");
    assert.equal(missing.status, 404);
    assert.ok(missing.headers.get("x-request-id"));
    assert.match(
      missing.headers.get("content-security-policy"),
      /youtube-nocookie/,
    );
    assert.deepEqual(await missing.json(), { error: "Title not found" });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("health reflects Redis readiness and hashed static assets are compressed and immutable", async () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const dir = fs.mkdtempSync(
    path.join(require("node:os").tmpdir(), "moop-headers-"),
  );
  fs.mkdirSync(path.join(dir, "assets"));
  fs.writeFileSync(path.join(dir, "index.html"), "<html>test</html>");
  fs.writeFileSync(
    path.join(dir, "assets", "index-test.js"),
    "/* bundled script */\n".repeat(500),
  );
  let ready = true;
  const server = createApp({
    token: "fixture",
    staticDir: dir,
    healthy: () => ready,
  }).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base + "/healthz")).status, 200);
    ready = false;
    const health = await fetch(base + "/healthz");
    assert.equal(health.status, 503);
    assert.deepEqual(await health.json(), {
      status: "unavailable",
      redis: "reconnecting",
    });
    const asset = await fetch(base + "/assets/index-test.js", {
      headers: { "Accept-Encoding": "gzip" },
    });
    assert.match(
      asset.headers.get("cache-control"),
      /max-age=31536000.*immutable/,
    );
    assert.equal(asset.headers.get("content-encoding"), "gzip");
    assert.ok(!asset.headers.get("x-powered-by"));
    assert.equal(
      asset.headers.get("referrer-policy"),
      "strict-origin-when-cross-origin",
    );
    const auth = await fetch(base + "/api/auth/me");
    assert.equal(auth.headers.get("referrer-policy"), "no-referrer");
    assert.match(
      (await fetch(base + "/")).headers.get("cache-control"),
      /max-age=0/,
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
