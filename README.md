# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
# moop-movies

## Local API setup

Use Node.js 22 or newer. Install dependencies with `npm install`.
Copy `.env.example` to `.env` if you do not already have a local `.env`, then set
`TMDB_READ_ACCESS_TOKEN` to your TMDB API Read Access Token. Never prefix this
secret with `REACT_APP_`; those variables are embedded in browser builds.

Run `npm run server` and `npm start` in separate terminals. Restart the React
server after changing the proxy configuration. React forwards `/api` requests
to port 3001 during development. Run backend checks with `npm run test:server`.

For production, deploy the Node API with `npm run server`, configure its token
in the host's environment, and route `/api/*` on the frontend domain to it.
The Create React App development proxy is not part of the production build.
The API permits only the TMDB read endpoints used by this application, validates
parameters, times out upstream calls, and limits each IP to 120 requests/minute.
If deploying behind a reverse proxy, configure Express trust proxy for your
specific hosting topology before relying on per-client rate limits. The default
in-memory limiter is per process; use a shared store when scaling instances.
Successful responses may be cached for 60 seconds.

Replace previously published credentials in TMDB and redeploy; removing keys
from source does not revoke keys in Git history or earlier browser bundles.

## TMDB accounts

Open **Account** in the bottom navigation, then **Sign in with TMDB**. Approve
access on TMDB to return to your account. The account screen displays movie/TV
watchlists and favourites; detail pages include add/remove buttons. Saved lists
are not filtered by Canadian availability, so saved titles remain visible.

Set `APP_ORIGIN` to the browser-facing origin (development:
`http://localhost:3000`) and `SESSION_SECRET` to a random secret of at least 32
characters. A secret has been generated in the local ignored `.env` during setup.
The callback is `/api/auth/callback` on that origin; production must route it to
Node, alongside the other `/api/*` paths. Authentication uses the existing TMDB
read access token; passwords are entered only on TMDB.

Sessions expire after 24 hours and are encrypted in `.sessions/` using the server
secret. Keep this directory private and persistent; never serve it as static
content or commit it. `SESSION_DIR` can select a persistent volume. This file
store is intended for one Node server; use a shared session store when scaling
across servers. Keep `SESSION_SECRET` stable across restarts. Set `NODE_ENV=production`
and an HTTPS `APP_ORIGIN` for secure cookies. Behind a trusted reverse proxy,
set `TRUST_PROXY_HOPS` to the actual trusted hop count (usually 1); do not enable
this if clients can bypass that proxy. Use HTTPS for both the site and API.

Signing out revokes the TMDB session. If TMDB cannot revoke it, the UI displays an
error and keeps the session so the user can retry. Local session expiration does
not itself revoke the remote TMDB authorization. Manage application access in
TMDB account settings as needed. Auth/account responses are never publicly cached.

## Render deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Render Free + Upstash setup.
Production now requires `REDIS_URL` and serves the React build through Express.
The file-session instructions above apply only to local development.
