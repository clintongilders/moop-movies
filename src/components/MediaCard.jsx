import React from "react";
import { Link, useLocation } from "react-router-dom";
import CardWatchlistButton from "./CardWatchlistButton";
import { useAuth } from "./AuthContext";
import { img_300, unavailable, formatDate } from "./config";

export default function MediaCard({ item, mediaType }) {
  const { account } = useAuth();
  const location = useLocation();
  const title = item.title || item.name;
  return (
    <div className="media-card-column col-6 col-sm-4 col-md-3 py-3">
      <div className="media-card-shell h-100">
        <Link
          to={`/${mediaType}/${item.id}`}
          state={{ from: location.pathname + location.search }}
          className="card bg-dark text-white text-decoration-none h-100"
          aria-label={`View details for ${title}`}
        >
          <img
            src={
              item.poster_path ? `${img_300}/${item.poster_path}` : unavailable
            }
            loading="lazy"
            width="300"
            height="450"
            sizes="(max-width: 575px) 50vw, (max-width: 767px) 33vw, 25vw"
            srcSet={
              item.poster_path
                ? `https://image.tmdb.org/t/p/w185${item.poster_path} 185w, https://image.tmdb.org/t/p/w300${item.poster_path} 300w, https://image.tmdb.org/t/p/w500${item.poster_path} 500w`
                : undefined
            }
            className="card-img-top media-card-poster"
            alt={title}
          />
          <div className="card-body">
            <h5 className="card-title text-center fs-5">{title}</h5>
            <div className="d-flex fs-6 align-items-center justify-content-evenly movie">
              <span>{mediaType === "tv" ? "TV Series" : "Movie"}</span>
              <span>
                {formatDate(item.first_air_date || item.release_date)}
              </span>
            </div>
          </div>
        </Link>
        <CardWatchlistButton
          key={`${account?.id || "guest"}-${mediaType}-${item.id}`}
          item={item}
          mediaType={mediaType}
        />
      </div>
    </div>
  );
}
