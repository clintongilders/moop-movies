require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('node:path');
const fs = require('node:fs');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const { createApp } = require('./app.cjs');
const port = process.env.PORT || 3001;
const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) throw new Error('Set SESSION_SECRET to a random value of at least 32 characters');
const sessionPath = process.env.SESSION_DIR || path.join(__dirname, '..', '.sessions');
fs.mkdirSync(sessionPath, { recursive: true, mode: 0o700 });
const store = new FileStore({ path: sessionPath, secret, ttl: 86400, retries: 0, logFn: () => {} });
createApp({
  token: process.env.TMDB_READ_ACCESS_TOKEN,
  sessionSecret: secret,
  sessionStore: store,
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:3000',
  production: process.env.NODE_ENV === 'production',
  trustProxy: process.env.TRUST_PROXY_HOPS ? Number(process.env.TRUST_PROXY_HOPS) : false,
}).listen(port, () => console.log(`API listening on port ${port}`));
