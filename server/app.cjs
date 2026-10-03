const express = require("express");
const { randomUUID } = require("node:crypto");
const { createTmdbClient } = require("./tmdb.cjs");
const { publicQuery } = require("./validation.cjs");
const { availableTitles } = require("./providers.cjs");
const { logError } = require("./log.cjs");
const { rateLimit } = require("express-rate-limit");

function createApp({ token, fetchImpl = fetch, staticDir, ...authOptions }) {
  if (!token) throw new Error("TMDB_READ_ACCESS_TOKEN is required");
  const app = express();
  app.disable("x-powered-by");
  const region = authOptions.region || "CA";
  if (!/^[A-Z]{2}$/.test(region))
    throw new Error("WATCH_REGION must be a two-letter uppercase country code");
  const tmdb = createTmdbClient({ token, fetchImpl });
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.set("X-Request-ID", req.requestId);
    next();
  });
  app.use(
    require("helmet")({
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      contentSecurityPolicy: {
        directives: {
          "img-src": ["'self'", "data:", "https://image.tmdb.org"],
          "frame-src": ["https://www.youtube-nocookie.com"],
          "script-src": ["'self'"],
          "upgrade-insecure-requests": authOptions.production ? [] : null,
        },
      },
    }),
  );
  app.use(require("compression")());
  app.get("/healthz", (req, res) => {
    const ready = !authOptions.healthy || authOptions.healthy();
    res.status(ready ? 200 : 503).json({
      status: ready ? "ok" : "unavailable",
      ...(authOptions.healthy
        ? { redis: ready ? "ready" : "reconnecting" }
        : {}),
    });
  });
  if (authOptions.trustProxy) app.set("trust proxy", authOptions.trustProxy);
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 120,
      message: { error: "Too many requests. Please try again in a minute." },
    }),
  );
  require("./auth.cjs").installAuth(app, { token, fetchImpl, ...authOptions });

  async function proxy(req, res, { path, kind = "resource" }) {
    try {
      const params = publicQuery({ query: req.query, path, kind, region });
      const data = await tmdb.get(path, params, {
        ttl: path.startsWith("genre/")
          ? 86400000
          : path.endsWith("/watch/providers")
            ? 3600000
            : 60000,
      });
      if (path.endsWith("/watch/providers")) data.region = region;
      if (data["watch/providers"]) data["watch/providers"].region = region;
      if (kind === "search")
        data.results = (data.results ?? []).filter((item) =>
          ["movie", "tv"].includes(item.media_type),
        );
      if (kind === "search" || path.startsWith("trending/"))
        data.results = await availableTitles(data.results || [], {
          tmdb,
          region,
          mediaType: path.split("/")[1],
          requestId: req.requestId,
        });
      res.set("Cache-Control", "public, max-age=60").json(data);
    } catch (error) {
      logError(error, { requestId: req.requestId });
      res.status(error.status || 502).json({
        error:
          error.status === 400
            ? error.message
            : error.status === 404
              ? "Title not found"
              : "Movie service unavailable",
      });
    }
  }

  app.get("/api/search", (req, res) =>
    proxy(req, res, { path: "search/multi", kind: "search" }),
  );
  app.get("/api/movies", (req, res) =>
    proxy(req, res, { path: "discover/movie", kind: "discover" }),
  );
  app.get("/api/tv", (req, res) =>
    proxy(req, res, { path: "discover/tv", kind: "discover" }),
  );
  // Only these read-only TMDB resources are reachable through the proxy.
  app.get(/^\/api\/tmdb\/(.+)$/, (req, res) => {
    const path = req.params[0];
    const allowed =
      /^(?:genre\/(?:movie|tv)\/list|trending\/(?:movie|tv|all)\/day|(?:movie|tv)\/[1-9]\d*(?:\/videos|\/watch\/providers)?)$/;
    if (!allowed.test(path))
      return res.status(404).json({ error: "Unknown endpoint" });
    return proxy(req, res, { path });
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "Unknown endpoint" }),
  );
  if (staticDir) {
    const path = require("node:path");
    if (!require("node:fs").existsSync(path.join(staticDir, "index.html")))
      throw new Error("Run npm run build before starting production");
    app.use(
      "/assets",
      express.static(require("node:path").join(staticDir, "assets"), {
        maxAge: "1y",
        immutable: true,
      }),
    );
    app.use(express.static(staticDir, { maxAge: 0 }));
    app.get("*", (req, res) =>
      res.sendFile(path.join(staticDir, "index.html")),
    );
  }
  app.use((error, req, res, next) => {
    logError(error, { requestId: req.requestId });
    if (res.headersSent) return next(error);
    res
      .status(error.type === "entity.parse.failed" ? 400 : 503)
      .json({ error: "Request unavailable. Please try again." });
  });
  return app;
}
module.exports = { createApp };
