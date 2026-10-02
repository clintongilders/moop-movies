/** Build a validated, server-controlled TMDB query. No arbitrary proxy parameters. */
function publicQuery({ query, path, kind, region }) {
  const search = kind === "search";
  const discover = kind === "discover";
  const allowed = search
    ? ["page", "query"]
    : discover
      ? ["page", "with_genres"]
      : ["page", "language"];
  const invalid = (message) => {
    throw Object.assign(new Error(message), { status: 400 });
  };
  if (Object.keys(query).some((key) => !allowed.includes(key)))
    invalid("Unsupported parameter");
  if (
    search &&
    (typeof query.query !== "string" ||
      !query.query.trim() ||
      query.query.length > 200)
  )
    invalid("Enter a search query between 1 and 200 characters");
  const page = query.page ?? "1";
  const genres = query.with_genres ?? "";
  if (
    typeof page !== "string" ||
    !/^[1-9]\d*$/.test(page) ||
    Number(page) > 500 ||
    typeof genres !== "string" ||
    genres.length > 200 ||
    (genres && !/^\d+(?:[,|]\d+)*$/.test(genres)) ||
    (query.language !== undefined && query.language !== "en-US")
  )
    invalid("Invalid parameters");
  const params = new URLSearchParams({ language: "en-US" });
  if (discover || search || path.startsWith("trending/"))
    params.set("page", page);
  if (search) {
    params.set("query", query.query.trim());
    params.set("include_adult", "false");
  }
  if (discover) {
    params.set("with_genres", genres);
    params.set("watch_region", region);
    params.set("with_watch_monetization_types", "flatrate|free|ads|rent|buy");
    params.set("sort_by", "popularity.desc");
    params.set("include_adult", "false");
    if (path === "discover/movie") params.set("include_video", "false");
  }
  if (/^(movie|tv)\/[1-9]\d*$/.test(path))
    params.set("append_to_response", "videos,watch/providers");
  return params;
}
module.exports = { publicQuery };
