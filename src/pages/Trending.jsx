import React, { useState } from "react";
import InfiniteMediaList from "../components/InfiniteMediaList";
import MediaType from "../components/MediaType";

const Trending = () => {
  const [mediaType, setMediaType] = useState("movie");
  return (
    <>
      <div className="container">
        <div className="row py-5 my-5">
          <div className="col-12 mt-2 mb-4 fs-1 fw-bold text-decoration-underline head d-flex justify-content-center align-items-center">
            <span aria-hidden="true" className="mx-4 text-danger">
              ↗
            </span>
            <h4 className="fs-2">Trending Today</h4>
            <span aria-hidden="true" className="mx-4 text-danger">
              ↗
            </span>
          </div>
          <MediaType mediaType={mediaType} setMediaType={setMediaType} />
          <InfiniteMediaList
            key={mediaType}
            endpoint={`/api/tmdb/trending/${mediaType}/day`}
            mediaType={mediaType}
          />
        </div>
      </div>
    </>
  );
};

export default Trending;
