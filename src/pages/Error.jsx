import React from "react";
import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <main className="container py-5 my-5">
      <h1>Page not found</h1>
      <Link to="/">Back to Trending</Link>
    </main>
  );
}
