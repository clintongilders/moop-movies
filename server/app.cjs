const express = require('express');
const { rateLimit } = require('express-rate-limit');

function createApp({ token, fetchImpl = fetch, staticDir, ...authOptions }) {
  if (!token) throw new Error('TMDB_READ_ACCESS_TOKEN is required');
  const app = express();
  app.disable('x-powered-by');
  app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
  if (authOptions.trustProxy) app.set('trust proxy', authOptions.trustProxy);
  app.use('/api', rateLimit({ windowMs: 60000, limit: 120 }));
  require('./auth.cjs').installAuth(app, { token, fetchImpl, ...authOptions });

  async function proxy(req, res, path, discover = false) {
    const search = path === 'search/multi';
    const allowed = search ? ['page', 'query'] : discover ? ['page', 'with_genres'] : ['page', 'language'];
    if (Object.keys(req.query).some(key => !allowed.includes(key))) {
      return res.status(400).json({ error: 'Unsupported parameter' });
    }
    if (search && (typeof req.query.query !== 'string' || !req.query.query.trim() || req.query.query.length > 200)) {
      return res.status(400).json({ error: 'Enter a search query between 1 and 200 characters' });
    }
    const page = req.query.page ?? '1';
    const genres = req.query.with_genres ?? '';
    if (typeof page !== 'string' || !/^[1-9]\d*$/.test(page) || Number(page) > 500 ||
        typeof genres !== 'string' || genres.length > 200 ||
        (genres && !/^\d+(?:[,|]\d+)*$/.test(genres)) ||
        (req.query.language !== undefined && req.query.language !== 'en-US')) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }
    const params = new URLSearchParams({ language: 'en-US' });
    if (discover || search || path.startsWith('trending/')) params.set('page', page);
    if (search) {
      params.set('query', req.query.query.trim());
      params.set('include_adult', 'false');
    }
    if (discover) {
      params.set('with_genres', genres);
      params.set('watch_region', 'CA');
      params.set('with_watch_monetization_types', 'flatrate|free|ads|rent|buy');
      params.set('sort_by', 'popularity.desc');
      params.set('include_adult', 'false');
      if (path === 'discover/movie') params.set('include_video', 'false');
    }
    try {
      const upstream = await fetchImpl(`https://api.themoviedb.org/3/${path}?${params}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!upstream.ok) return res.status(502).json({ error: 'Unable to load TMDB data' });
      const data = await upstream.json();
      if (search) data.results = (data.results ?? []).filter(item => ['movie', 'tv'].includes(item.media_type));
      if (search || /^discover\/(movie|tv)$/.test(path) || /^trending\/(movie|tv|all)\/day$/.test(path)) {
        const eligible = [];
        // Bound concurrent provider lookups and preserve the original result order.
        for (let index = 0; index < (data.results ?? []).length; index += 5) {
          const batch = data.results.slice(index, index + 5);
          const checks = await Promise.all(batch.map(async item => {
            const mediaType = (search || path === 'trending/all/day') ? item.media_type : path.split('/')[1];
            if (!['movie', 'tv'].includes(mediaType)) return true;
            const response = await fetchImpl(`https://api.themoviedb.org/3/${mediaType}/${item.id}/watch/providers`, {
              headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
              signal: AbortSignal.timeout(10000),
            });
            if (!response.ok) throw new Error('Provider availability lookup failed');
            const canada = (await response.json()).results?.CA;
            return ['flatrate', 'free', 'ads', 'rent', 'buy'].some(category =>
              (canada?.[category] ?? []).some(provider =>
                ![582, 2303, 2304].includes(provider.provider_id) &&
                !/^paramount\s*(?:plus|\+)\s+apple\s+tv\s+channel$/i.test((provider.provider_name ?? '').trim())));
          }));
          eligible.push(...batch.filter((item, index) => checks[index]));
        }
        data.results = eligible;
      }
      res.set('Cache-Control', 'public, max-age=60').json(data);
    } catch {
      res.status(502).json({ error: 'Movie service unavailable' });
    }
  }

  app.get('/api/search', (req, res) => proxy(req, res, 'search/multi'));
  app.get('/api/movies', (req, res) => proxy(req, res, 'discover/movie', true));
  app.get('/api/tv', (req, res) => proxy(req, res, 'discover/tv', true));
  // Only these read-only TMDB resources are reachable through the proxy.
  app.get(/^\/api\/tmdb\/(.+)$/, (req, res) => {
    const path = req.params[0];
    const allowed = /^(?:genre\/(?:movie|tv)\/list|trending\/(?:movie|tv|all)\/day|(?:movie|tv)\/[1-9]\d*(?:\/videos|\/watch\/providers)?)$/;
    if (!allowed.test(path)) return res.status(404).json({ error: 'Unknown endpoint' });
    return proxy(req, res, path);
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown endpoint' }));
  if (staticDir) {
    const path = require('node:path');
    if (!require('node:fs').existsSync(path.join(staticDir, 'index.html'))) throw new Error('Run npm run build before starting production');
    app.use(express.static(staticDir));
    app.get('*', (req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.status(error.type === 'entity.parse.failed' ? 400 : 503).json({ error: 'Request unavailable. Please try again.' });
  });
  return app;
}
module.exports = { createApp };
