const { categories } = require("./tmdb.cjs");
const { logError } = require("./log.cjs");
async function availableTitles(items, { tmdb, region, mediaType, requestId }) {
  const result = [];
  for (let index = 0; index < items.length; index += 5) {
    const batch = items.slice(index, index + 5);
    const checks = await Promise.all(
      batch.map(async (item) => {
        const type = item.media_type || mediaType;
        if (!["movie", "tv"].includes(type)) return false;
        try {
          const providers = await tmdb.get(
            `${type}/${item.id}/watch/providers`,
            {},
            { ttl: 3600000 },
          );
          return categories.some(
            (category) =>
              (providers.results?.[region]?.[category] || []).length > 0,
          );
        } catch (error) {
          logError(error, { requestId, event: "provider_lookup_failed" });
          return true;
        }
      }),
    );
    result.push(...batch.filter((item, index) => checks[index]));
  }
  return result;
}
module.exports = { availableTitles };
