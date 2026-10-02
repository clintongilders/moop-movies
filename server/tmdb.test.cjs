const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createTmdbClient } = require("./tmdb.cjs");

test("cache deduplicates concurrent requests, isolates returned objects, expires and bounds entries", async () => {
  let now = 0;
  let calls = 0;
  const client = createTmdbClient({
    token: "secret",
    maxEntries: 2,
    now: () => now,
    fetchImpl: async () => {
      calls++;
      return { ok: true, json: async () => ({ results: [{ id: 1 }] }) };
    },
  });
  const [a, b] = await Promise.all([
    client.get("movie/1"),
    client.get("movie/1"),
  ]);
  a.results.length = 0;
  assert.equal(b.results.length, 1);
  assert.equal((await client.get("movie/1")).results.length, 1);
  assert.equal(calls, 1);
  now = 60001;
  await client.get("movie/1");
  assert.equal(calls, 2);
  await client.get("movie/2");
  await client.get("movie/3");
  await client.get("movie/1");
  assert.equal(calls, 5);
});

test("failed requests are not cached and upstream 404/429 statuses survive", async () => {
  let status = 404;
  const client = createTmdbClient({
    token: "secret",
    fetchImpl: async () => ({
      ok: status === 200,
      status,
      json: async () => ({ id: 1 }),
    }),
  });
  await assert.rejects(client.get("movie/1"), { status: 404 });
  status = 429;
  await assert.rejects(client.get("movie/1"), { status: 429 });
  status = 200;
  assert.equal((await client.get("movie/1")).id, 1);
});

test("provider exclusions are applied to standalone and appended responses", async () => {
  const providers = {
    results: {
      CA: {
        flatrate: [
          { provider_id: 8 },
          { provider_id: 582 },
          {
            provider_id: 999,
            provider_name: "Paramount Plus Apple TV Channel",
          },
        ],
      },
    },
  };
  const client = createTmdbClient({
    token: "secret",
    fetchImpl: async (url) => ({
      ok: true,
      json: async () =>
        url.includes("/watch/providers?")
          ? structuredClone(providers)
          : { "watch/providers": structuredClone(providers) },
    }),
  });
  assert.deepEqual(
    (await client.get("movie/1/watch/providers")).results.CA.flatrate,
    [{ provider_id: 8 }],
  );
  assert.deepEqual(
    (await client.get("movie/1"))["watch/providers"].results.CA.flatrate,
    [{ provider_id: 8 }],
  );
});
