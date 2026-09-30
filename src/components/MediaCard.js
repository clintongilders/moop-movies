import React from "react";
import { Link, useLocation } from "react-router-dom";
import CardWatchlistButton from "./CardWatchlistButton";
import { useAuth } from "./AuthContext";
import { img_300, unavailable } from "./config";

export default function MediaCard({ item, mediaType }) {
  const { account } = useAuth();
  const location = useLocation();
  const title = item.title || item.name;
  return (
    <div className="col-md-3 col-sm-4 py-3">
      <div className="media-card-shell h-100">
      <Link to={`/${mediaType}/${item.id}`} state={{ from: location.pathname + location.search }} className="card bg-dark text-white text-decoration-none h-100" aria-label={`View details for ${title}`}>
        <img src={item.poster_path ? `${img_300}/${item.poster_path}` : unavailable} className="card-img-top media-card-poster" alt={title} />
        <div className="card-body">
          <h5 className="card-title text-center fs-5">{title}</h5>
          <div className="d-flex fs-6 align-items-center justify-content-evenly movie">
            <span>{mediaType === "tv" ? "TV Series" : "Movie"}</span>
            <span>{item.first_air_date || item.release_date}</span>
          </div>
        </div>
      </Link>
      <CardWatchlistButton key={`${account?.id || "guest"}-${mediaType}-${item.id}`} item={item} mediaType={mediaType} />
      </div>
    </div>
  );
}
