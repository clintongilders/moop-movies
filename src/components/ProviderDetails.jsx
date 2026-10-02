import React from "react";

import useApiQuery from "./useApiQuery";
// HTTPS links let the operating system handle supported app links, with web fallback.
// These are service homepages: TMDB does not supply provider-specific title URLs.
const providerSites = {
  8: "https://www.netflix.com/ca/",
  9: "https://www.primevideo.com/",
  119: "https://www.primevideo.com/",
  337: "https://www.disneyplus.com/",
  2: "https://tv.apple.com/ca",
  350: "https://tv.apple.com/ca",
  230: "https://www.crave.ca/",
  531: "https://www.paramountplus.com/ca/",
};

const categories = [
  ["flatrate", "Streaming"],
  ["free", "Free"],
  ["ads", "Free with ads"],
  ["rent", "Rent"],
  ["buy", "Buy"],
];

export default function ProviderDetails({
  movieId,
  mediaType = "movie",
  data,
}) {
  const query = useApiQuery(
    `/api/tmdb/${mediaType}/${movieId}/watch/providers`,
    "Unable to load watch providers. Please try again later.",
    { enabled: !data && !!movieId, initialData: data },
  );
  const providers = query.data?.results?.[query.data.region || "CA"] || null;
  const loading = !data && query.isPending && !!movieId;
  const error = query.error?.message;

  const region = query.data?.region || "CA";
  const country = new Intl.DisplayNames(["en-CA"], { type: "region" }).of(
    region,
  );
  const groups = categories
    .map(([key, label]) => ({
      key,
      label,
      items: providers?.[key] ?? [],
    }))
    .filter((group) => group.items.length > 0);
  const watchLink = providers?.link?.startsWith("https://www.themoviedb.org/")
    ? providers.link
    : null;

  return (
    <section aria-label="Where to watch" className="mt-4">
      <h2 className="h4">Where to watch in {country}</h2>
      {loading ? (
        <p role="status">Loading watch providers...</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <>
          {groups.length === 0 && (
            <p>No watch providers are currently listed for {country}.</p>
          )}
          {groups.map(({ key, label, items }) => (
            <div key={key} className="mb-3">
              <h3 className="h6">{label}</h3>
              <ul className="list-unstyled d-flex flex-wrap gap-3">
                {items.map((provider) => {
                  const site = providerSites[provider.provider_id];
                  const href = site || watchLink;
                  const content = provider.logo_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                      width="48"
                      height="48"
                      style={{ objectFit: "contain" }}
                      className="rounded"
                      alt={provider.provider_name}
                    />
                  ) : (
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 48 48"
                      role="img"
                      aria-label={provider.provider_name}
                    >
                      <rect
                        x="2"
                        y="2"
                        width="44"
                        height="44"
                        rx="8"
                        fill="currentColor"
                        opacity="0.2"
                      />
                      <path d="M19 14v20l16-10z" fill="currentColor" />
                    </svg>
                  );
                  return (
                    <li
                      key={provider.provider_id}
                      title={provider.provider_name}
                    >
                      {href ? (
                        <a
                          href={href}
                          className="d-flex align-items-center gap-2 text-reset"
                          aria-label={
                            site
                              ? `Open ${provider.provider_name}`
                              : `Find ${provider.provider_name} watch options on TMDB`
                          }
                        >
                          {content}
                        </a>
                      ) : (
                        <span className="d-flex align-items-center gap-2">
                          {content}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {groups.length > 0 && (
            <p className="small">
              Provider links open the service; search for the title there. Your
              device may open its installed app. Other providers link to watch
              options on TMDB.
            </p>
          )}
          {watchLink && (
            <p>
              <a href={watchLink} target="_blank" rel="noopener noreferrer">
                View watch options on TMDB
              </a>
            </p>
          )}
          <p className="small">
            Availability data provided by{" "}
            <a
              href={`https://www.justwatch.com/${region.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              JustWatch
            </a>{" "}
            via TMDB.
          </p>
        </>
      )}
    </section>
  );
}
