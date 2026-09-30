import React, { useState } from "react";
import InfiniteMediaList from "../components/InfiniteMediaList";
import Genre from "../components/Genre";
import useGenre from "../useGenre";
import useGenreFilters from "../useGenreFilters";

const TV = () => {
  const [genre, setGenre] = useState([]); //used to store the origional genre values
  const [value, setValue] = useGenreFilters();
  const genreURL = useGenre(value);

  const endpoint = `/api/tv?with_genres=${encodeURIComponent(genreURL || "")}`;

  return (
    <>
      <div className="container">
        <div className="row py-5 my-5">
          <div className="col-12 text-center mt-2 mb-4 fs-1 fw-bold text-decoration-underline">
            TV
          </div>
          <Genre
            genre={genre}
            setGenre={setGenre}
            setPage={() => {}}
            type="tv"
            value={value}
            setValue={setValue}
          />
          <InfiniteMediaList key={endpoint} endpoint={endpoint} mediaType="tv" />
        </div>
      </div>
    </>
  );
};

export default TV;
