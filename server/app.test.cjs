const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app.cjs');

test('proxy validates inputs, keeps credentials server-side, and sanitizes failures', async () => {
  const calls = [];
  const app = createApp({ token: 'test-secret', fetchImpl: async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/watch/providers')) return { ok: true, json: async () => ({ results: { CA: { flatrate: [{ provider_id: 8, provider_name: 'Netflix' }] } } }) };
    if (url.includes('/movie/99?')) throw new Error('private upstream information');
    return { ok: true, json: async () => ({ results: [{ id: 1 }] }) };
  }});
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/api/movies?page=2&with_genres=28%7C12`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { results: [{ id: 1 }] });
    assert.equal(calls[0].options.headers.Authorization, 'Bearer test-secret');
    assert.equal(new URL(calls[0].url).searchParams.get('page'), '2');
    assert.equal(new URL(calls[0].url).searchParams.get('with_genres'), '28|12');
    for (const query of ['page=0', 'page=501', 'page=1&page=2', 'with_genres=bad', 'url=https://example.com']) {
      assert.equal((await fetch(`${base}/api/movies?${query}`)).status, 400);
    }
    assert.equal(new URL(calls[0].url).searchParams.get('watch_region'), 'CA');
    assert.equal(new URL(calls[0].url).searchParams.get('with_watch_monetization_types'), 'flatrate|free|ads|rent|buy');
    assert.equal(calls.length, 2);
    const tv = await fetch(`${base}/api/tv?page=3&with_genres=18,35`);
    assert.equal(tv.status, 200);
    const tvUrl = new URL(calls[2].url);
    assert.equal(tvUrl.pathname, '/3/discover/tv');
    assert.equal(tvUrl.searchParams.get('page'), '3');
    assert.equal(tvUrl.searchParams.get('with_genres'), '18,35');
    assert.equal(tvUrl.searchParams.has('include_video'), false);
    assert.equal((await fetch(`${base}/api/tv?page=0`)).status, 400);

    assert.equal((await fetch(`${base}/api/tmdb/account`)).status, 404);
    for (const path of ['genre/movie/list', 'trending/tv/day', 'movie/1', 'tv/1/videos', 'movie/1/watch/providers']) {
      assert.equal((await fetch(`${base}/api/tmdb/${path}`)).status, 200);
    }
    const failure = await fetch(`${base}/api/tmdb/movie/99`);
    assert.equal(failure.status, 502);
    assert.deepEqual(await failure.json(), { error: 'Movie service unavailable' });
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('movie and TV listings omit missing Canadian availability and excluded channels', async () => {
  const app = createApp({ token: 'test-secret', fetchImpl: async url => {
    const id = url.match(/(?:movie|tv)\/(\d+)\/watch/ )?.[1];
    const availability = {
      1: { CA: { rent: [{ provider_id: 2, provider_name: 'Apple TV' }] } },
      2: { US: { flatrate: [{ provider_id: 8, provider_name: 'Netflix' }] } },
      3: { CA: { flatrate: [{ provider_id: 999, provider_name: 'Paramount Plus Apple TV Channel' }] } },
      4: { CA: { flatrate: [{ provider_id: 582, provider_name: 'Excluded' }] } },
      5: { CA: { free: [{ provider_id: 100, provider_name: 'Free provider' }] } },
    };
    return { ok: true, json: async () => ({ results: id ? availability[id] : [1, 2, 3, 4, 5].map(id => ({ id })) }) };
  }});
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    for (const path of ['/api/movies', '/api/tv', '/api/tmdb/trending/movie/day', '/api/tmdb/trending/tv/day']) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`);
      assert.equal(response.status, 200);
      assert.deepEqual((await response.json()).results.map(item => item.id), [1, 5]);
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('search validates and encodes queries, removes people, and checks Canadian availability', async () => {
  const calls = [];
  const app = createApp({ token: 'test', fetchImpl: async url => {
    calls.push(url);
    return { ok: true, json: async () => url.includes('/watch/providers')
      ? { results: url.includes('/movie/') ? { CA: { rent: [{ provider_id: 2 }] } } : {} }
      : { total_pages: 2, results: [{ id: 1, media_type: 'movie' }, { id: 2, media_type: 'tv' }, { id: 3, media_type: 'person' }] } };
  }});
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const query of ['', '?query=%20', '?query=a&query=b', '?query=a&page=0']) {
      assert.equal((await fetch(`${base}/api/search${query}`)).status, 400);
    }
    assert.equal(calls.length, 0);
    const response = await fetch(`${base}/api/search?query=${encodeURIComponent('Law & Order')}&page=2`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { total_pages: 2, results: [{ id: 1, media_type: 'movie' }] });
    const upstream = new URL(calls[0]);
    assert.equal(upstream.pathname, '/3/search/multi');
    assert.equal(upstream.searchParams.get('query'), 'Law & Order');
    assert.equal(upstream.searchParams.get('page'), '2');
    assert.equal(upstream.searchParams.get('include_adult'), 'false');
    assert.equal(calls.length, 3);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('production hosting serves SPA routes but preserves API 404s', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'moop-static-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<html>MOOP test app</html>');
  const app = createApp({ token: 'test', staticDir: dir });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ['/', '/movie/42', '/account']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /MOOP test app/);
    }
    assert.equal((await fetch(base + '/api/missing')).status, 404);
    assert.deepEqual(await (await fetch(base + '/healthz')).json(), { status: 'ok' });
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    fs.unlinkSync(path.join(dir, 'index.html'));
    fs.rmdirSync(dir);
  }
});
