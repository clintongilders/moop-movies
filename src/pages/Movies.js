import React, { useState } from "react";
import InfiniteMediaList from "../components/InfiniteMediaList";
import Genre from "../components/Genre";
import useGenre from "../useGenre";
import useGenreFilters from "../useGenreFilters";

const Movies = () => {
  const [genre, setGenre] = useState([]); //used to store the origional genre values
  const [value, setValue] = useGenreFilters();
  const genreURL = useGenre(value);

  const endpoint = `/api/movies?with_genres=${encodeURIComponent(genreURL || "")}`;

  return (
    <>
      <div className="container">
        <div className="row py-5 my-5">
          <div className="col-12 text-center mt-2 mb-4 fs-1 fw-bold text-decoration-underline">
            Movies
          </div>
          <Genre
            genre={genre}
            setGenre={setGenre}
            setPage={() => {}}
            type="movie"
            value={value}
            setValue={setValue}
          />
          <InfiniteMediaList key={endpoint} endpoint={endpoint} mediaType="movie" />
        </div>
      </div>
    </>
  );
};

export default Movies;
