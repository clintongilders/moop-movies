import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import AccountActions from "../components/AccountActions";
import ProviderDetails from "../components/ProviderDetails";
import { img_500, unavailable } from "../components/config";

export default function SingleMovie({ mediaType }) {
  const { id } = useParams();
  const location = useLocation();
  const fromAccount = location.state?.from === "/account";
  const fromSearch = typeof location.state?.from === "string" && /^\/search(?:\?|$)/.test(location.state.from);
  const fromTrending = location.state?.from === "/";
  const [details, setDetails] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setDetails(null);
    setError("");
    async function load() {
      try {
        const response = await fetch(`/api/tmdb/${mediaType}/${id}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load details. Please try again later.");
        setDetails(await response.json());
      } catch (error) {
        if (error.name !== "AbortError") setError(error.message);
      }
    }
    load();
    return () => controller.abort();
  }, [mediaType, id]);

  const isTV = mediaType === "tv";
  return (
    <main className="container py-5 my-5">
      <Link to={fromAccount ? "/account" : fromSearch ? location.state.from : fromTrending ? "/" : isTV ? "/tv" : "/movies"} className="btn btn-outline-light mb-4">
        Back to {fromAccount ? "my account" : fromSearch ? "search results" : fromTrending ? "Trending" : isTV ? "TV shows" : "movies"}
      </Link>
      {error ? <p role="alert">{error}</p> : !details ? <p role="status">Loading details...</p> : (
        <div className="row g-4 detail-layout">
          <div className="col-md-4 detail-poster">
            <img src={details.poster_path ? `${img_500}/${details.poster_path}` : unavailable} alt={details.title || details.name} className="img-fluid rounded" />
          </div>
          <div className="col-md-8 detail-content">
            <h1>{details.title || details.name}</h1>
            {details.tagline && <p className="fst-italic">{details.tagline}</p>}
            <p>{details.genres?.map(genre => genre.name).join(" • ")}</p>
            <h2 className="h4">Overview</h2>
            <p>{details.overview || "No description is available yet."}</p>
            <dl className="row detail-facts">
              <dt className="col-sm-4">{isTV ? "First aired" : "Release date"}</dt>
              <dd className="col-sm-8">{(isTV ? details.first_air_date : details.release_date) || "Unknown"}</dd>
              <dt className="col-sm-4">Rating</dt>
              <dd className="col-sm-8">{details.vote_count > 0 ? `${details.vote_average.toFixed(1)} / 10 (${details.vote_count} votes)` : "Not rated yet"}</dd>
              <dt className="col-sm-4">Status</dt>
              <dd className="col-sm-8">{details.status || "Unknown"}</dd>
              {isTV ? <>
                <dt className="col-sm-4">Seasons</dt><dd className="col-sm-8">{details.number_of_seasons ?? "Unknown"}</dd>
                <dt className="col-sm-4">Episodes</dt><dd className="col-sm-8">{details.number_of_episodes ?? "Unknown"}</dd>
              </> : <>
                <dt className="col-sm-4">Runtime</dt><dd className="col-sm-8">{details.runtime ? `${details.runtime} minutes` : "Unknown"}</dd>
              </>}
            </dl>
            <AccountActions key={`account-${mediaType}-${id}`} mediaType={mediaType} id={id} />
            <ProviderDetails key={`${mediaType}-${id}`} movieId={id} mediaType={mediaType} />
          </div>
        </div>
      )}
    </main>
  );
}
