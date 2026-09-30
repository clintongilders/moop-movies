import React, { useEffect, useState } from "react";

// HTTPS links let the operating system handle supported app links, with web fallback.
// These are service homepages: TMDB does not supply provider-specific title URLs.
const providerSites = {
  Netflix: "https://www.netflix.com/ca/",
  "Netflix Standard with Ads": "https://www.netflix.com/ca/",
  "Amazon Prime Video": "https://www.primevideo.com/",
  "Amazon Prime Video with Ads": "https://www.primevideo.com/",
  "Disney Plus": "https://www.disneyplus.com/",
  "Apple TV": "https://tv.apple.com/ca",
  "Apple TV Plus": "https://tv.apple.com/ca",
  Crave: "https://www.crave.ca/",
  "Paramount Plus": "https://www.paramountplus.com/ca/",
};

const categories = [
  ["flatrate", "Streaming"],
  ["free", "Free"],
  ["ads", "Free with ads"],
  ["rent", "Rent"],
  ["buy", "Buy"],
];
const excludedProviders = new Set([582, 2303, 2304]);

export default function ProviderDetails({ movieId, mediaType = "movie" }) {
  const [providers, setProviders] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setProviders(null);
    setLoading(true);
    setError("");
    async function load() {
      try {
        const response = await fetch(`/api/tmdb/${mediaType}/${movieId}/watch/providers`, { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load watch providers. Please try again later.");
        const data = await response.json();
        if (!controller.signal.aborted) setProviders(data.results?.CA ?? null);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    if (movieId) load();
    else setLoading(false);
    return () => controller.abort();
  }, [movieId, mediaType]);

  const groups = categories.map(([key, label]) => ({
    key, label, items: (providers?.[key] ?? []).filter(provider => !excludedProviders.has(provider.provider_id) &&
      !/^paramount\s*(?:plus|\+)\s+apple\s+tv\s+channel$/i.test((provider.provider_name ?? "").trim())),
  })).filter(group => group.items.length > 0);
  const watchLink = providers?.link?.startsWith("https://www.themoviedb.org/") ? providers.link : null;

  return (
    <section aria-label="Where to watch" className="mt-4">
      <h2 className="h4">Where to watch in Canada</h2>
      {loading ? <p role="status">Loading watch providers...</p> : error ? <p role="alert">{error}</p> : (
        <>
          {groups.length === 0 && <p>No watch providers are currently listed for Canada.</p>}
          {groups.map(({ key, label, items }) => (
            <div key={key} className="mb-3">
              <h3 className="h6">{label}</h3>
              <ul className="list-unstyled d-flex flex-wrap gap-3">
                {items.map(provider => {
                  const site = providerSites[provider.provider_name];
                  const href = site || watchLink;
                  const content = provider.logo_path ? (
                    <img src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`} width="48" height="48" style={{ objectFit: "contain" }} className="rounded" alt={provider.provider_name} />
                  ) : (
                    <svg width="48" height="48" viewBox="0 0 48 48" role="img" aria-label={provider.provider_name}>
                      <rect x="2" y="2" width="44" height="44" rx="8" fill="currentColor" opacity="0.2" />
                      <path d="M19 14v20l16-10z" fill="currentColor" />
                    </svg>
                  );
                  return (
                    <li key={provider.provider_id} title={provider.provider_name}>
                      {href ? (
                        <a href={href} className="d-flex align-items-center gap-2 text-reset"
                          aria-label={site ? `Open ${provider.provider_name}` : `Find ${provider.provider_name} watch options on TMDB`}>
                          {content}
                        </a>
                      ) : <span className="d-flex align-items-center gap-2">{content}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {groups.length > 0 && <p className="small">Provider links open the service; search for the title there. Your device may open its installed app. Other providers link to watch options on TMDB.</p>}
          {watchLink && <p><a href={watchLink} target="_blank" rel="noopener noreferrer">View watch options on TMDB</a></p>}
          <p className="small">Availability data provided by <a href="https://www.justwatch.com/ca" target="_blank" rel="noopener noreferrer">JustWatch</a> via TMDB.</p>
        </>
      )}
    </section>
  );
}
