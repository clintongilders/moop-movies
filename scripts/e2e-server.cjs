const path = require("node:path");
const { createApp } = require("../server/app.cjs");
let watchlist = [];
const app = createApp({
  token: "fixture-app-token",
  sessionSecret: "fixture-session-secret-with-at-least-32-characters",
  appOrigin: "http://127.0.0.1:3100",
  staticDir: path.join(__dirname, "..", "dist"),
  fetchImpl: async (url, options) => {
    const pathname = new URL(url).pathname;
    let data;
    if (pathname.endsWith("/token/new"))
      data = { request_token: "fixture-request" };
    else if (pathname.endsWith("/session/new"))
      data = { session_id: "fixture-session" };
    else if (pathname === "/3/account")
      data = { id: 7, username: "browser-tester" };
    else if (options.method === "POST") {
      const body = JSON.parse(options.body);
      watchlist = body.watchlist
        ? [{ id: body.media_id, title: "Fixture movie" }]
        : [];
      data = { success: true };
    } else if (pathname.includes("/watchlist/"))
      data = { results: watchlist, total_pages: 1 };
    else if (pathname.includes("/account_states"))
      data = { watchlist: watchlist.length > 0, favorite: false };
    else if (pathname === "/3/movie/42")
      data = {
        id: 42,
        title: "Fixture movie",
        vote_count: 0,
        genres: [],
        videos: { results: [] },
        "watch/providers": { results: {} },
      };
    else data = { results: [], total_pages: 1 };
    return { ok: true, json: async () => data };
  },
});
const server = app.listen(3100, "127.0.0.1");
process.once("SIGTERM", () => {
  server.closeAllConnections();
  server.close();
});
