/**
 * @typedef {{provider_id: number, provider_name?: string, logo_path?: string}} Provider
 * @typedef {{id: number, media_type?: 'movie'|'tv', title?: string, name?: string}} Title
 * @typedef {{token: string, fetchImpl?: typeof fetch, maxEntries?: number, now?: () => number}} ClientOptions
 */
const categories = ["flatrate", "free", "ads", "rent", "buy"];
const excluded = (provider) =>
  [582, 2303, 2304].includes(provider.provider_id) ||
  /^paramount\s*(?:plus|\+)\s+apple\s+tv\s+channel$/i.test(
    (provider.provider_name || "").trim(),
  );
function cleanProviders(data) {
  if (!data?.results || Array.isArray(data.results)) return data;
  for (const region of Object.values(data.results)) {
    for (const category of categories)
      if (region[category])
        region[category] = region[category].filter(
          (provider) => !excluded(provider),
        );
  }
  return data;
}
/** @param {ClientOptions} options */
function createTmdbClient({
  token,
  fetchImpl = fetch,
  maxEntries = 1000,
  now = Date.now,
}) {
  const cache = new Map();
  const pending = new Map();
  async function get(path, params = {}, { ttl = 60000 } = {}) {
    const query = new URLSearchParams(params);
    query.sort();
    const key = `${path}?${query}`;
    const cached = cache.get(key);
    if (cached && cached.expires > now()) return structuredClone(cached.data);
    if (pending.has(key)) return structuredClone(await pending.get(key));
    const request = (async () => {
      const response = await fetchImpl(`https://api.themoviedb.org/3/${key}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        const error = new Error("TMDB request failed");
        error.status = [404, 429].includes(response.status)
          ? response.status
          : 502;
        throw error;
      }
      const data = await response.json();
      if (path.endsWith("/watch/providers")) cleanProviders(data);
      if (data["watch/providers"]) cleanProviders(data["watch/providers"]);
      cache.delete(key);
      if (cache.size >= maxEntries) cache.delete(cache.keys().next().value);
      cache.set(key, { expires: now() + ttl, data });
      return data;
    })();
    pending.set(key, request);
    try {
      return structuredClone(await request);
    } finally {
      pending.delete(key);
    }
  }
  return { get };
}
module.exports = { createTmdbClient, cleanProviders, categories };
