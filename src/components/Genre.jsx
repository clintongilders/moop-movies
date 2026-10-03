import React, { useId, useState } from "react";

import useApiQuery from "./useApiQuery";
const Genre = ({ type, value, setValue }) => {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const query = useApiQuery(
    `/api/tmdb/genre/${type}/list?language=en-US`,
    "Genre filters are unavailable right now.",
    { staleTime: 86400000 },
  );
  const loading = query.isPending;
  const error = query.error?.message;
  const genres = query.data?.genres || [];

  const toggleGenre = (selected) => {
    setValue((previous) =>
      previous.some((item) => item.id === selected.id)
        ? previous.filter((item) => item.id !== selected.id)
        : [...previous, selected],
    );
  };
  const clearGenres = () => {
    setValue([]);
  };

  return (
    <section className="col-12 mb-4" aria-label="Filter by genre">
      <div className={`genre-panel${expanded ? " is-expanded" : ""}`}>
        <div className="genre-mobile-toolbar">
          <button
            type="button"
            className="genre-toggle"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((previous) => !previous)}
          >
            <span>
              Genres{" "}
              <span className="genre-count">
                {value.length ? `${value.length} selected` : "All"}
              </span>
            </span>
            <span aria-hidden="true">{expanded ? "−" : "+"}</span>
          </button>
          {value.length > 0 && (
            <button type="button" className="genre-clear" onClick={clearGenres}>
              Clear
            </button>
          )}
        </div>
        <div className="genre-toolbar">
          <div>
            <h2 className="genre-heading">Explore by genre</h2>
            <p className="genre-hint">
              {value.length
                ? `${value.length} selected · Matches any selected genre`
                : "Find something that fits your mood"}
            </p>
          </div>
          {value.length > 0 && (
            <button type="button" className="genre-clear" onClick={clearGenres}>
              Clear filters
            </button>
          )}
        </div>
        {loading && (
          <p role="status" className="genre-hint">
            Loading genres...
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        <div id={panelId} className="genre-chips">
          {!loading && !error && (
            <button
              type="button"
              className={`genre-chip${value.length === 0 ? " is-selected" : ""}`}
              aria-pressed={value.length === 0}
              onClick={clearGenres}
            >
              All genres
            </button>
          )}
          {genres.map((item) => {
            const selected = value.some(
              (selection) => selection.id === item.id,
            );
            return (
              <button
                key={item.id}
                type="button"
                className={`genre-chip${selected ? " is-selected" : ""}`}
                aria-pressed={selected}
                onClick={() => toggleGenre(item)}
              >
                {selected && <span aria-hidden="true">✓ </span>}
                {item.name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Genre;
