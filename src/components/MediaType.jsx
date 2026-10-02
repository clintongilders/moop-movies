import React from "react";

const MediaType = ({ mediaType, setMediaType }) => (
  <div
    className="container-fluid"
    role="group"
    aria-label="Trending media type"
  >
    <div className="row mb-3">
      <div className="col-12 d-flex flex-wrap">
        {[
          ["movie", "Movies"],
          ["tv", "TV Shows"],
        ].map(([type, label]) => (
          <div className="m-2" key={type}>
            <button
              type="button"
              className={`bg-dark text-white px-4 py-2 text-center button${mediaType === type ? " buttons" : ""}`}
              aria-pressed={mediaType === type}
              onClick={() => setMediaType(type)}
            >
              {label}
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default MediaType;
