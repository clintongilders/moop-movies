import React from "react";
import InfiniteMediaList from "../components/InfiniteMediaList";
import Genre from "../components/Genre";
import useGenre from "../useGenre";
import useGenreFilters from "../useGenreFilters";

const MediaBrowse = ({ mediaType }) => {
  const [value, setValue] = useGenreFilters();
  const genreURL = useGenre(value);

  const endpoint = `/api/${mediaType === "movie" ? "movies" : "tv"}?with_genres=${encodeURIComponent(genreURL || "")}`;

  return (
    <>
      <div className="container media-browse">
        <div className="row py-5 my-5 media-browse-grid">
          <div className="col-12 text-center mt-2 mb-4 fs-1 fw-bold text-decoration-underline media-browse-heading">
            {mediaType === "movie" ? "Movies" : "TV"}
          </div>
          <Genre type={mediaType} value={value} setValue={setValue} />
          <InfiniteMediaList
            key={endpoint}
            endpoint={endpoint}
            mediaType={mediaType}
          />
        </div>
      </div>
    </>
  );
};

export default MediaBrowse;
