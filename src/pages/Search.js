import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import InfiniteMediaList from "../components/InfiniteMediaList";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const query = (params.get("q") || "").trim();
  const [input, setInput] = useState(query);
  useEffect(() => setInput(query), [query]);
  const endpoint = `/api/search?${new URLSearchParams({ query })}`;

  return (
    <main className="container py-5 my-5">
      <h1 className="mb-3">Search</h1>
      <p className="text-light">Find movies and TV shows available from Canadian providers.</p>
      <form role="search" className="mb-4" onSubmit={event => {
        event.preventDefault();
        setParams(input.trim() ? { q: input.trim() } : {});
      }}>
        <label htmlFor="title-search" className="form-label">Movie or TV show title</label>
        <div className="d-flex gap-2">
          <input id="title-search" type="search" className="form-control bg-dark text-white" placeholder="Search titles…" value={input} maxLength={200} onChange={event => setInput(event.target.value)} />
          <button type="submit" className="btn btn-light" disabled={!input.trim()}>Search</button>
        </div>
        {query && <button type="button" className="btn btn-outline-light mt-2" onClick={() => { setInput(""); setParams({}); }}>Clear search</button>}
      </form>
      {query ? <>
        <h2 className="h5">Results for “{query}”</h2>
        <div className="row"><InfiniteMediaList key={endpoint} endpoint={endpoint} mediaType="movie" /></div>
      </> : <p>Enter a title to start searching.</p>}
    </main>
  );
}
