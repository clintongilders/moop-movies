# Render + Upstash deployment

## 1. Create Upstash Redis

Create an account at https://console.upstash.com/ and create a **Redis** database
on the **Free** plan. Choose a region near Render Oregon (the Blueprint default),
or change `region` in `render.yaml` before deploying.

Open the database's **Connect → TCP** instructions and copy the complete
`rediss://...` connection URL. Use the TCP URL, not the REST URL or REST token.
Keep it private. If constructing the URL manually, URL-encode the password.

## 2. Deploy the Render Blueprint

Commit and push the deployment files and accompanying server/package changes to
`main` in `clintongilders/moop-movies` first. Keep `.env` untracked; enter production
secrets in Render only.

Create an account at https://dashboard.render.com/ and connect GitHub. Choose
**New → Blueprint**, select `clintongilders/moop-movies` and branch `main`.
Render should detect `render.yaml` and a single **Free** web service.

After setup, each push to `main` automatically triggers a deploy. No GitHub
Actions workflow or deploy hook is required. The Blueprint runs
`npm ci --include=dev && npm run build`, then starts the Express server with
`npm run server`, which serves both the built frontend and API.

Enter the prompted secrets directly in Render:

| Variable | Value |
| --- | --- |
| `TMDB_READ_ACCESS_TOKEN` | TMDB API Read Access Token, not the short API key |
| `REDIS_URL` | Upstash TLS TCP connection URL starting with `rediss://` |

The Blueprint generates `SESSION_SECRET` and configures Node, the build command,
start command, and trusted proxy. Keep `SESSION_SECRET` stable: rotating it
invalidates existing cookies and encrypted sessions.

The service uses Render's `RENDER_EXTERNAL_URL` for the TMDB callback, so no
manual URL setup is needed on the default onrender.com domain. For a custom
domain, set `APP_ORIGIN=https://your-domain.example` to the exact public origin
(without a path). Never put these server secrets in `REACT_APP_*` variables.

Review the service's **Free** plan before creating the Blueprint. Do not add a
paid disk or database. Free-tier quotas and idle startup delays still apply.

## 3. Verify

- Wait for a successful build and the service's **Live** status.
- Open `/healthz` on its public URL; expect `{"status":"ok"}`.
- Open Movies and TV and load a detail page; refresh its URL directly.
- Open Account, sign in with TMDB, and approve access.
- Add a title to your watchlist and confirm it appears in Account.
- Sign out and confirm account lists require login again.

TMDB's return URL is `https://YOUR-SERVICE.onrender.com/api/auth/callback`.
Both the frontend and API run on the same service, preserving secure cookies.
Keep any Render preview and custom-domain origins consistent when signing in.

## Storage and troubleshooting

Production requires Upstash; it never falls back to disposable local sessions.
Redis session payloads are encrypted using AES-256-GCM and expire with the
24-hour session lifetime. Upstash connections use TLS. Watchlists/favourites
remain on TMDB. Local development uses ignored `.sessions/` unless `REDIS_URL`
is set locally too. Use separate databases for development and production.

Startup failures: check both secrets and the TLS connection URL. Redis errors
are deliberately logged without credentials. Confirm the Upstash database is
active. If the app builds but immediately exits, check environment settings.

Sign-in fails: confirm the public origin is HTTPS and `TRUST_PROXY_HOPS=1` on
Render; no custom domain or proxy should silently change the callback origin.

Free Render services sleep when idle; the first visit may take longer. External
sessions survive Render restarts, but Upstash free-tier limits still apply.
The app's IP rate limiter is currently per process, appropriate to this single
instance deployment. Scaling to multiple instances needs a shared limiter.

Do not use `npm start` as Render's start command; that launches React's development
server. Use `npm run server` as configured in the Blueprint.
