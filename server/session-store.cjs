const {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} = require("node:crypto");

function sessionSerializer(secret) {
  const key = createHash("sha256")
    .update(`moop-redis-session:${secret}`)
    .digest();
  return {
    stringify(value) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const ciphertext = Buffer.concat([
        cipher.update(JSON.stringify(value), "utf8"),
        cipher.final(),
      ]);
      return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
        "base64",
      );
    },
    parse(value) {
      const bytes = Buffer.from(value, "base64");
      const decipher = createDecipheriv(
        "aes-256-gcm",
        key,
        bytes.subarray(0, 12),
      );
      decipher.setAuthTag(bytes.subarray(12, 28));
      return JSON.parse(
        Buffer.concat([
          decipher.update(bytes.subarray(28)),
          decipher.final(),
        ]).toString("utf8"),
      );
    },
  };
}

async function createSessionStore({
  secret,
  redisUrl,
  production,
  sessionPath,
  redisCa,
}) {
  if (redisUrl) {
    if (new URL(redisUrl).protocol !== "rediss:")
      throw new Error("REDIS_URL must use rediss:// (TLS)");
    const { createClient } = require("redis");
    const { RedisStore } = require("connect-redis");
    const client = createClient({
      url: redisUrl,
      disableOfflineQueue: true,
      socket: {
        ...(redisCa ? { ca: redisCa } : {}),
        connectTimeout: 10000,
        reconnectStrategy: (retries) =>
          Math.min(30000, 500 * 2 ** Math.min(retries, 6)),
      },
    });
    client.on("error", (error) =>
      require("./log.cjs").logError(error, {
        event: "redis_connection_failed",
      }),
    );
    try {
      await Promise.race([
        client.connect(),
        new Promise((_, reject) => {
          const timer = setTimeout(
            () => reject(new Error("Redis startup timed out")),
            15000,
          );
          timer.unref();
        }),
      ]);
    } catch (error) {
      client.destroy();
      throw error;
    }
    return {
      store: new RedisStore({
        client,
        prefix: "moop:session:",
        ttl: 86400,
        disableTouch: true,
        serializer: sessionSerializer(secret),
      }),
      healthy: () => client.isReady,
      close: () => client.destroy(),
    };
  }
  if (production) throw new Error("REDIS_URL is required in production");
  const fs = require("node:fs");
  const FileStore = require("session-file-store")(require("express-session"));
  fs.mkdirSync(sessionPath, { recursive: true, mode: 0o700 });
  return {
    store: new FileStore({
      path: sessionPath,
      secret,
      ttl: 86400,
      retries: 0,
      logFn: () => {},
    }),
    close: async () => {},
  };
}
module.exports = { createSessionStore, sessionSerializer };
