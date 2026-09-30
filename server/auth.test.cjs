const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app.cjs');

test('TMDB auth binds approval to browser, rotates session, protects writes and revokes logout', async () => {
  const calls = [];
  const app = createApp({ token: 'app-secret', sessionSecret: 'test-secret-for-session-signing', fetchImpl: async (url, options) => {
    calls.push({ url, options });
    const path = new URL(url).pathname;
    const data = path.endsWith('/token/new') ? { request_token: 'request-secret' }
      : path.endsWith('/session/new') ? { session_id: 'session-secret' }
      : path === '/3/account' ? { id: 7, username: 'tester', name: 'Test' }
      : path.endsWith('/account_states') ? { watchlist: true, favorite: false }
      : options.method === 'GET' ? { results: [], total_pages: 0 } : { success: true };
    return { ok: true, json: async () => data };
  }});
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  const request = async (path, options = {}) => {
    const response = await fetch(base + path, { redirect: 'manual', ...options, headers: { Cookie: cookie, ...options.headers } });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return response;
  };
  try {
    assert.equal((await request('/api/account/watchlist/movie')).status, 401);
    let response = await request('/api/auth/me');
    assert.match(response.headers.get('set-cookie'), /HttpOnly/);
    assert.match(response.headers.get('set-cookie'), /SameSite=Lax/);
    let auth = await response.json();
    assert.equal(auth.account, null);
    assert.equal((await request('/api/auth/start', { method: 'POST' })).status, 403);
    response = await request('/api/auth/start', { method: 'POST', headers: { 'X-CSRF-Token': auth.csrf } });
    const redirect = new URL((await response.json()).url);
    const callback = new URL(redirect.searchParams.get('redirect_to'));
    const callbackPath = `${callback.pathname}${callback.search}&request_token=request-secret&approved=true`;
    const foreign = await fetch(base + callbackPath, { redirect: 'manual' });
    assert.match(foreign.headers.get('location'), /auth=failed/);
    const oldCookie = cookie;
    response = await request(callbackPath);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), 'http://localhost:3000/account');
    assert.notEqual(cookie, oldCookie);
    response = await request('/api/auth/me');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const text = await response.text();
    assert.ok(!text.includes('session-secret'));
    auth = JSON.parse(text);
    assert.equal(auth.account.username, 'tester');
    assert.match((await request(callbackPath)).headers.get('location'), /auth=failed/);
    response = await request('/api/account/states/tv/42');
    assert.deepEqual(await response.json(), { watchlist: true, favorite: false });
    assert.equal((await request('/api/account/watchlist', { method: 'POST' })).status, 403);
    response = await request('/api/account/watchlist', { method: 'POST', headers: { 'X-CSRF-Token': auth.csrf, 'Content-Type': 'application/json' }, body: JSON.stringify({ media_type: 'tv', media_id: 42, enabled: true }) });
    assert.equal(response.status, 200);
    const write = calls.find(call => call.url.includes('/account/7/watchlist') && call.options.method === 'POST');
    assert.deepEqual(JSON.parse(write.options.body), { media_type: 'tv', media_id: 42, watchlist: true });
    assert.equal(new URL(write.url).searchParams.get('session_id'), 'session-secret');
    assert.equal((await request('/api/account/favorite/movie?page=1')).status, 200);
    assert.equal((await request('/api/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': auth.csrf } })).status, 200);
    assert.ok(calls.some(call => call.options.method === 'DELETE'));
    assert.equal((await request('/api/account/watchlist/movie')).status, 401);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
