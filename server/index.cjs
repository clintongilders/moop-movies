require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const path = require("node:path");
const { createApp } = require("./app.cjs");
const { createSessionStore } = require("./session-store.cjs");

async function start() {
  const production = process.env.NODE_ENV === "production";
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error(
      "Set SESSION_SECRET to a random value of at least 32 characters",
    );
  const appOrigin =
    process.env.APP_ORIGIN ||
    process.env.RENDER_EXTERNAL_URL ||
    (production ? "" : "http://localhost:3000");
  if (!appOrigin || (production && !appOrigin.startsWith("https://")))
    throw new Error("An HTTPS APP_ORIGIN is required in production");
  const { store, close, healthy } = await createSessionStore({
    secret,
    redisUrl: process.env.REDIS_URL,
    production,
    sessionPath:
      process.env.SESSION_DIR || path.join(__dirname, "..", ".sessions"),
  });
  const app = createApp({
    token: process.env.TMDB_READ_ACCESS_TOKEN,
    sessionSecret: secret,
    healthy,
    region: process.env.WATCH_REGION || "CA",
    sessionStore: store,
    appOrigin,
    production,
    trustProxy: process.env.TRUST_PROXY_HOPS
      ? Number(process.env.TRUST_PROXY_HOPS)
      : false,
    staticDir: production ? path.join(__dirname, "..", "dist") : undefined,
  });
  const server = app.listen(process.env.PORT || 3001, "0.0.0.0", () =>
    console.log("MOOP server listening"),
  );
  const shutdown = () => {
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    server.close(async () => {
      try {
        await close();
        process.exit(0);
      } catch (error) {
        require("./log.cjs").logError(error, { event: "shutdown_failed" });
        process.exit(1);
      }
    });
    server.closeIdleConnections();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
start().catch((error) => {
  require("./log.cjs").logError(error, { event: "startup_failed" });
  console.error(
    error.message.replace(/rediss?:\/\/[^\s]+/g, "[redacted Redis URL]"),
  );
  process.exit(1);
});
