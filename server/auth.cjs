const session = require('express-session');
const { randomBytes } = require('node:crypto');
const express = require('express');

function installAuth(app, { token, fetchImpl, sessionSecret, appOrigin = 'http://localhost:3000', sessionStore, production = false }) {
  const origin = new URL(appOrigin).origin;
  if (production && (!sessionSecret || !sessionStore || !origin.startsWith('https://'))) {
    throw new Error('Production auth requires SESSION_SECRET, an HTTPS APP_ORIGIN, and a persistent sessionStore');
  }
  const cookie = { httpOnly: true, sameSite: 'lax', secure: production, maxAge: 24 * 60 * 60 * 1000, path: '/' };
  app.use(['/api/auth', '/api/account'], (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    next();
  }, session({ name: 'moop.sid', secret: sessionSecret || randomBytes(32).toString('hex'), resave: false, saveUninitialized: false, cookie, ...(sessionStore ? { store: sessionStore } : {}) }), express.json({ limit: '4kb' }));
  const wrap = handler => (req, res, next) => Promise.resolve(handler(req, res)).catch(() => res.status(502).json({ error: 'TMDB account service is unavailable. Please try again.' }));
  async function tmdb(path, { sid, method = 'GET', body, params = {} } = {}) {
    const url = new URL(`https://api.themoviedb.org/3/${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    if (sid) url.searchParams.set('session_id', sid);
    const response = await fetchImpl(url.toString(), { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('TMDB request failed');
    const data = await response.json();
    if (data.success === false) throw new Error('TMDB rejected request');
    return data;
  }
  const save = req => new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
  const csrf = (req, res, next) => {
    if (!req.session.csrf || req.get('X-CSRF-Token') !== req.session.csrf) return res.status(403).json({ error: 'Refresh the page and try again.' });
    next();
  };
  const signedIn = (req, res, next) => {
    if (!req.session.tmdbSession || !req.session.account) return res.status(401).json({ error: 'Connect your TMDB account first.' });
    next();
  };
  app.get('/api/auth/me', wrap(async (req, res) => {
    req.session.csrf ||= randomBytes(32).toString('hex');
    res.json({ account: req.session.account || null, csrf: req.session.csrf });
  }));
  app.post('/api/auth/start', csrf, wrap(async (req, res) => {
    if (req.session.account) return res.status(409).json({ error: 'Sign out before connecting another account.' });
    const data = await tmdb('authentication/token/new');
    if (!data.request_token) throw new Error('Missing token');
    const state = randomBytes(32).toString('hex');
    req.session.pending = { token: data.request_token, state, expires: Date.now() + 10 * 60 * 1000 };
    await save(req);
    const callback = `${origin}/api/auth/callback?state=${state}`;
    res.json({ url: `https://www.themoviedb.org/authenticate/${encodeURIComponent(data.request_token)}?redirect_to=${encodeURIComponent(callback)}` });
  }));
  app.get('/api/auth/callback', async (req, res) => {
    const pending = req.session.pending;
    if (!pending || pending.expires < Date.now() || req.query.state !== pending.state || req.query.request_token !== pending.token) {
      return res.redirect(`${origin}/account?auth=failed`);
    }
    delete req.session.pending;
    try {
      await save(req);
      if (req.query.approved !== 'true') return res.redirect(`${origin}/account?auth=denied`);
      const data = await tmdb('authentication/session/new', { method: 'POST', body: { request_token: pending.token } });
      if (!data.session_id) throw new Error('Missing session');
      let account;
      try { account = await tmdb('account', { sid: data.session_id }); }
      catch (error) {
        await tmdb('authentication/session', { method: 'DELETE', body: { session_id: data.session_id } }).catch(() => {});
        throw error;
      }
      if (!Number.isInteger(account.id)) throw new Error('Missing account');
      await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
      req.session.tmdbSession = data.session_id;
      req.session.account = { id: account.id, username: account.username, name: account.name };
      req.session.csrf = randomBytes(32).toString('hex');
      await save(req);
      return res.redirect(`${origin}/account`);
    } catch { return res.redirect(`${origin}/account?auth=failed`); }
  });
  app.post('/api/auth/logout', csrf, wrap(async (req, res) => {
    if (req.session.tmdbSession) await tmdb('authentication/session', { method: 'DELETE', body: { session_id: req.session.tmdbSession } });
    await new Promise((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
    res.clearCookie('moop.sid', { path: '/', httpOnly: true, sameSite: 'lax', secure: production });
    res.json({ success: true });
  }));
  app.get('/api/account/:list/:type', signedIn, wrap(async (req, res) => {
    const { list, type } = req.params;
    const page = req.query.page || '1';
    if (!['watchlist', 'favorite'].includes(list) || !['movie', 'tv'].includes(type) || typeof page !== 'string' || !/^[1-9]\d*$/.test(page) || +page > 500) return res.status(400).json({ error: 'Invalid list request' });
    const data = await tmdb(`account/${req.session.account.id}/${list}/${type === 'movie' ? 'movies' : 'tv'}`, { sid: req.session.tmdbSession, params: { page, language: 'en-US', sort_by: 'created_at.desc' } });
    res.json(data);
  }));
  app.get('/api/account/states/:type/:id', signedIn, wrap(async (req, res) => {
    if (!['movie', 'tv'].includes(req.params.type) || !/^[1-9]\d*$/.test(req.params.id)) return res.status(400).json({ error: 'Invalid title' });
    const data = await tmdb(`${req.params.type}/${req.params.id}/account_states`, { sid: req.session.tmdbSession });
    res.json({ favorite: !!data.favorite, watchlist: !!data.watchlist });
  }));
  app.post('/api/account/:list', signedIn, csrf, wrap(async (req, res) => {
    const { media_type, media_id, enabled } = req.body || {};
    const { list } = req.params;
    if (!['watchlist', 'favorite'].includes(list) || !['movie', 'tv'].includes(media_type) || !Number.isSafeInteger(media_id) || media_id < 1 || typeof enabled !== 'boolean') return res.status(400).json({ error: 'Invalid title update' });
    await tmdb(`account/${req.session.account.id}/${list}`, { sid: req.session.tmdbSession, method: 'POST', body: { media_type, media_id, [list]: enabled } });
    res.json({ success: true });
  }));
}
module.exports = { installAuth };
