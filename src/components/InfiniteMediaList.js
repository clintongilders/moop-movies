import React, { useCallback, useEffect, useRef, useState } from "react";
import MediaCard from "./MediaCard";

// Mount with a key matching the query so filters reset results and cancel old requests.
export default function InfiniteMediaList({ endpoint, mediaType, emptyMessage = "No titles with Canadian providers found." }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const nextPage = useRef(1);
  const busy = useRef(false);
  const finished = useRef(false);
  const controller = useRef(null);
  const sentinel = useRef(null);

  const loadMore = useCallback(async () => {
    if (busy.current || finished.current) return;
    busy.current = true;
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    setError("");
    try {
      const separator = endpoint.includes("?") ? "&" : "?";
      const response = await fetch(`${endpoint}${separator}page=${nextPage.current}`, { signal: request.signal });
      if (!response.ok) throw new Error("Unable to load titles. Please try again.");
      const data = await response.json();
      if (request.signal.aborted) return;
      setItems(previous => {
        const unique = new Map(previous.map(item => [`${item.media_type || mediaType}-${item.id}`, item]));
        for (const item of data.results ?? []) unique.set(`${item.media_type || mediaType}-${item.id}`, item);
        return [...unique.values()];
      });
      // Provider filtering can leave an empty page before the actual last page.
      finished.current = nextPage.current >= Math.min(data.total_pages ?? nextPage.current, 500);
      nextPage.current += 1;
      setHasMore(!finished.current);
    } catch (error) {
      if (!request.signal.aborted) setError(error.message);
    } finally {
      if (!request.signal.aborted) {
        busy.current = false;
        setLoading(false);
      }
    }
  }, [endpoint, mediaType]);

  useEffect(() => {
    loadMore();
    return () => {
      controller.current?.abort();
      busy.current = false;
    };
  }, [loadMore]);

  useEffect(() => {
    if (loading || error || !hasMore || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadMore();
    }, { rootMargin: "300px" });
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [loading, error, hasMore, loadMore]);

  return <>
    {items.map(item => <MediaCard key={`${item.media_type || mediaType}-${item.id}`} item={item} mediaType={item.media_type || mediaType} />)}
    <div ref={sentinel} className="col-12 text-center py-4">
      {loading && <p role="status">Loading titles...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && hasMore && <button className="btn btn-outline-light" onClick={loadMore}>{error ? "Try again" : "Load more"}</button>}
      {!hasMore && <p>{items.length ? "You've reached the end." : emptyMessage}</p>}
    </div>
  </>;
}
