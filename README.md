# MOOP Movies

MOOP Movies is a React and Express app for discovering movies and TV shows available in Canada. It uses TMDB for title information and account features, with watch-provider availability supplied by JustWatch through TMDB.

## Features

- Browse today's trending movies or TV shows.
- Explore movies and TV with genre filters and infinite scrolling. Genre selections are stored in the URL and preserved when returning from a detail page.
- View title details, ratings, and Canadian streaming, free, ad-supported, rental, and purchase options.
- Play available YouTube trailers in a modal, with an option to open them on YouTube.
- Connect a TMDB account to manage movie and TV watchlists and favourites. Watchlist controls are available on cards; detail pages offer account actions.

Movie and TV discovery use TMDB’s region and monetization filters without per-title provider requests. Search and trending check cached provider availability and exclude unsupported channels; if a provider lookup fails, the title remains visible. Provider panels always remove excluded channels. This means discovery can include a title whose only provider is excluded from the panel. Saved account lists are not availability-filtered. Provider links open service homepages or TMDB watch pages rather than provider-specific title pages.

Search code and an API endpoint exist, but the search screen is currently hidden: `/search` redirects to the home page.

## Local development

### Requirements

- Node.js 22.12 or newer and npm.
- A TMDB API Read Access Token.
- A TMDB account if you want to use watchlists and favourites.

Redis is optional locally. Without it, the API stores encrypted sessions in the ignored `.sessions/` directory.

### Setup

From the project directory:

```sh
npm ci
cp .env.example .env
```

If `.env` already exists, keep your existing settings instead of overwriting it. Edit `.env` and set:

```dotenv
TMDB_READ_ACCESS_TOKEN=your_tmdb_read_access_token
APP_ORIGIN=http://localhost:3000
SESSION_SECRET=your_random_secret_at_least_32_characters
```

Use the TMDB **API Read Access Token**, not the short API key. Generate a session secret with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy the generated value into `SESSION_SECRET`. Keep it stable across restarts to preserve sessions.

### Start both services

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The React development server forwards `/api` requests to Express on port **3001**.

The launcher checks that ports **3000** and **3001** are available before starting either service. Press **Ctrl+C** to stop both. If either service exits, the launcher stops the other automatically.

React reloads when frontend files change. Restart `npm run dev` after changing backend code or environment settings; the backend does not run in watch mode.

To start the services separately, run `npm run server` and `npm start` in separate terminals.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API and React development server together. |
| `npm start` | Start only the React development server. |
| `npm run server` | Start Express; also serve `dist/` when `NODE_ENV=production`. |
| `npm test` | Run Vitest frontend tests once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:server` | Run backend tests with Node's test runner. |
| `npm run build` | Generate the production frontend in `dist/`. |
| `npm run lint` | Check frontend hooks and server code. |
| `npm run format:check` | Check Prettier formatting. |
| `npm run test:redis` | Verify TLS Redis sessions and outage recovery using temporary Docker infrastructure. |
| `npm run test:e2e` | Test built-app sign-in, watchlist, and logout in Chromium with fixture TMDB approval. |

## Environment variables

The API reads `.env` from the project root. Hosting platforms can provide these values through their environment instead.

| Variable | Purpose |
| --- | --- |
| `TMDB_READ_ACCESS_TOKEN` | Required. Server-side TMDB API Read Access Token. |
| `SESSION_SECRET` | Required. Random secret of at least 32 characters, used for cookies and session encryption. |
| `APP_ORIGIN` | Browser-facing origin without a path. Use `http://localhost:3000` locally and an HTTPS origin in production. |
| `REDIS_URL` | Optional locally; required in production. TLS Redis TCP URL starting with `rediss://`, not an Upstash REST URL or token. |
| `SESSION_DIR` | Optional local file-session directory; defaults to `.sessions/`. Used when Redis is unset. |
| `TRUST_PROXY_HOPS` | Trusted reverse-proxy hop count. Leave unset locally; the Render Blueprint sets it to `1`. |
| `NODE_ENV` | Set to `production` for deployment. The combined development launcher sets it to `development`. |
| `WATCH_REGION` | Optional ISO country code for provider availability; defaults to `CA`. |
| `PORT` | Express listen port, default `3001`. Keep the default for the development launcher and frontend proxy. |
| `RENDER_EXTERNAL_URL` | Render-provided fallback for `APP_ORIGIN`. Set `APP_ORIGIN` explicitly for a custom domain. |

Keep `.env`, `.sessions/`, and real credentials out of Git. Never prefix server secrets with `VITE_`: Vite embeds those variables in browser builds. If credentials have been published, revoke or rotate them; deleting them from source does not remove them from Git history or previous builds.

If you set `REDIS_URL` locally, use a separate development database from production.

## TMDB accounts

Open **Account**, choose **Sign in with TMDB**, and approve access on TMDB. Passwords are entered on TMDB, not in this app. The browser returns through `/api/auth/callback` on `APP_ORIGIN`.

Anonymous account checks issue a signed CSRF cookie without creating a stored session. Stored account sessions begin at sign-in and last 24 hours. Card watchlist states share one query per account and media type, rather than fetching once per card. Local sessions use encrypted file storage; Redis sessions use AES-256-GCM encryption. Watchlists and favourites remain stored on TMDB.

Signing out clears the local session immediately; TMDB revocation is best effort, with one bounded retry; failures are logged. A revoked or expired TMDB session clears local authentication on its next account request. Local session expiration does not revoke remote TMDB access; you can manage application access through your TMDB account.

## Architecture

The frontend uses React 19, React Router, TanStack Query, Bootstrap, and Vite. The Express API keeps credentials server-side, validates TMDB requests, and manages cookie-based account sessions.

```text
src/
  components/       Shared UI, authentication context, trailers, and providers
  pages/            Trending, Movies, TV, title details, and Account
  useGenreFilters.jsx URL-backed genre selections
server/
  index.cjs         Environment setup and server startup
  app.cjs           Browse endpoints, TMDB proxy, and production static files
  auth.cjs          TMDB sign-in, sign-out, and account endpoints
  tmdb.cjs          Bounded TTL cache, deduplication, provider sanitization
  validation.cjs    Public query parameter validation
  providers.cjs     Fail-soft availability filtering
  log.cjs           Structured error metadata without credentials
  session-store.cjs  Encrypted file or Redis session storage
scripts/
  dev.cjs           Combined development launcher
vite.config.mjs     Development /api proxy and Vitest configuration
render.yaml         Render deployment Blueprint
```

### API overview

| Endpoint | Purpose |
| --- | --- |
| `GET /healthz` | HTTP 200 when ready; HTTP 503 while Redis is unavailable. Redis mode also reports `redis: ready/reconnecting`. |
| `GET /api/movies` | Canadian movie discovery; accepts `page` and `with_genres`. |
| `GET /api/tv` | Canadian TV discovery; accepts `page` and `with_genres`. |
| `GET /api/search` | Movie/TV search API; accepts `query` and `page`. Currently unused by the routed UI. |
| `GET /api/tmdb/*` | Allowlisted genres, daily trending titles, title details, videos, and watch providers. |
| `/api/auth/*` | Current account, sign-in, callback, and sign-out. |
| `/api/account/*` | Watchlists, favourites, and saved-title states. |

Account writes require authentication and an `X-CSRF-Token` obtained from `GET /api/auth/me`; authentication POST requests also require the token. The frontend handles these requests.

The API limits each IP to 120 requests per minute per server process. TMDB requests time out after 10 seconds. A bounded in-memory cache deduplicates concurrent requests: genres last 24 hours, provider lookups one hour, and other public results one minute. Successful public responses advertise a 60-second cache lifetime; account and authentication responses use `no-store`. The proxy is restricted to supported endpoints rather than exposing arbitrary TMDB requests.

## Production deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Render and Upstash setup. The checked-in Blueprint builds and serves the frontend and API from a single Express service.

Build command:

```sh
npm ci --include=dev
npm run build
```

Start command, with production environment variables configured:

```sh
NODE_ENV=production npm run server
```

Production requires `TMDB_READ_ACCESS_TOKEN`, `SESSION_SECRET`, a `rediss://` connection, and an HTTPS public origin through `APP_ORIGIN` or `RENDER_EXTERNAL_URL`. Express serves `dist/`, handles frontend route refreshes, and exposes `/api` on the same origin.

Use `npm run server` as the production start command. `npm start` launches React's development server. Production never falls back to local file sessions. Configure trusted proxy hops for your hosting topology; multiple API instances also require a shared rate limiter.

## Troubleshooting

### Ports already in use

Stop any existing React or API development terminals before running `npm run dev`. On macOS, identify listeners with:

```sh
lsof -nP -iTCP:3000 -iTCP:3001 -sTCP:LISTEN
```

Confirm a process belongs to this app before stopping it. The launcher reports port conflicts without terminating existing processes.

### API startup fails

Check that the TMDB token is set and `SESSION_SECRET` has at least 32 characters. If Redis is configured, check its availability and ensure the connection uses `rediss://`. Production also requires an HTTPS origin and an existing frontend build.

### Frontend loads but API requests fail

Ensure Express is running on port 3001. The development proxy is configured in `vite.config.mjs`; restart the frontend after changing proxy settings. The proxy is not part of the production build.

### TMDB sign-in fails

Check that `APP_ORIGIN` matches the origin used in the browser, including its port. Use `http://localhost:3000` consistently in development. Production requires HTTPS, secure cookies, and correct trusted-proxy configuration. Keep the session secret stable and restart after changing environment settings.

### Fewer browse results or unavailable trailers

Canadian provider filtering can remove titles from upstream result pages. Provider availability comes from TMDB/JustWatch and can differ from a service's current catalogue. Trailers appear only when TMDB supplies a supported YouTube trailer.

## Data attribution

Movie and TV metadata and images come from TMDB. Canadian watch-provider data comes from JustWatch through TMDB. Trailer playback uses YouTube embeds.

## Quality checks and deployment gating

GitHub Actions runs lint, formatting, server tests, a real TLS Redis outage/recovery test, frontend tests, a production build, browser account-flow tests, and a production dependency audit. The Render Blueprint uses [`autoDeployTrigger: checksPass`](https://render.com/docs/blueprint-spec#autodeploytrigger); apply the Blueprint or set **After CI Checks Pass** on the existing service after pushing the workflow. Local configuration changes alone do not update the live service.

To run browser tests locally: `npx playwright install chromium`, `npm run build`, then `npm run test:e2e`. The test simulates TMDB approval; it does not log into a real TMDB account.

Responses use Helmet security headers and a CSP allowing TMDB images and YouTube nocookie frames, gzip compression, and immutable year-long caching for hashed `/assets` files. Redis reconnects indefinitely with capped backoff. Shutdown closes idle connections and has a 10-second deadline. Error logs include request IDs and safe error metadata, without tokens or request URLs.

Rotating `SESSION_SECRET` invalidates signed cookies and encrypted sessions, logging users out. There is no key-ring rotation support yet; use a deliberate maintenance rotation.
