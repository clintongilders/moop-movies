import React, { useEffect, useId, useState } from "react";

const Genre = ({ genre, setGenre, setPage, type, value, setValue }) => {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    async function load() {
      try {
        const response = await fetch(`/api/tmdb/genre/${type}/list?language=en-US`, { signal: controller.signal });
        if (!response.ok) throw new Error("Genre filters are unavailable right now.");
        const data = await response.json();
        if (!controller.signal.aborted) setGenre(data.genres ?? []);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [type, setGenre]);

  const toggleGenre = selected => {
    setValue(previous => previous.some(item => item.id === selected.id)
      ? previous.filter(item => item.id !== selected.id)
      : [...previous, selected]);
    setPage?.(1);
  };
  const clearGenres = () => {
    setValue([]);
    setPage?.(1);
  };

  return (
    <section className="col-12 mb-4" aria-label="Filter by genre">
      <div className={`genre-panel${expanded ? " is-expanded" : ""}`}>
        <div className="genre-mobile-toolbar">
          <button type="button" className="genre-toggle" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(previous => !previous)}>
            <span>Genres <span className="genre-count">{value.length ? `${value.length} selected` : "All"}</span></span>
            <span aria-hidden="true">{expanded ? "−" : "+"}</span>
          </button>
          {value.length > 0 && <button type="button" className="genre-clear" onClick={clearGenres}>Clear</button>}
        </div>
        <div className="genre-toolbar">
          <div>
            <h2 className="genre-heading">Explore by genre</h2>
            <p className="genre-hint">{value.length ? `${value.length} selected · Matches any selected genre` : "Find something that fits your mood"}</p>
          </div>
          {value.length > 0 && <button type="button" className="genre-clear" onClick={clearGenres}>Clear filters</button>}
        </div>
        {loading && <p role="status" className="genre-hint">Loading genres...</p>}
        {error && <p role="alert">{error}</p>}
        <div id={panelId} className="genre-chips">
          {!loading && !error && <button type="button" className={`genre-chip${value.length === 0 ? " is-selected" : ""}`} aria-pressed={value.length === 0} onClick={clearGenres}>All genres</button>}
          {genre.map(item => {
            const selected = value.some(selection => selection.id === item.id);
            return (
              <button key={item.id} type="button" className={`genre-chip${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={() => toggleGenre(item)}>
                {selected && <span aria-hidden="true">✓ </span>}{item.name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Genre;
