import React, { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { apiGet } from "./useApiQuery";
import MediaCard from "./MediaCard";

export default function InfiniteMediaList({
  endpoint,
  mediaType,
  emptyMessage = "No titles with Canadian providers found.",
}) {
  const { account, refresh } = useAuth();
  const sentinel = useRef(null);
  const query = useInfiniteQuery({
    queryKey: [
      "media",
      endpoint,
      endpoint.startsWith("/api/account/") ? account?.id : null,
    ],
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      return apiGet(
        `${endpoint}${endpoint.includes("?") ? "&" : "?"}page=${pageParam}`,
        signal,
        "Unable to load titles. Please try again.",
      );
    },
    getNextPageParam: (last, pages, previous) =>
      previous < Math.min(last.total_pages ?? previous, 500)
        ? previous + 1
        : undefined,
  });
  useEffect(() => {
    if (query.error?.status === 401) refresh?.();
  }, [query.error, refresh]);
  const { hasNextPage, isFetching, isError, fetchNextPage } = query;
  // The server drops unavailable titles, so pages can arrive empty. Stop
  // auto-loading after a few in a row and leave the "Load more" button.
  const pages = query.data?.pages || [];
  const emptyRun =
    pages.length - 1 - pages.findLastIndex((page) => page.results?.length > 0);
  const paused = emptyRun >= 3;
  useEffect(() => {
    if (
      isFetching ||
      isError ||
      paused ||
      !hasNextPage ||
      !window.IntersectionObserver
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [isFetching, isError, paused, hasNextPage, fetchNextPage, pages.length]);
  const items = [
    ...new Map(
      pages
        .flatMap((page) => page.results || [])
        .map((item) => [`${item.media_type || mediaType}-${item.id}`, item]),
    ).values(),
  ];
  return (
    <>
      {items.map((item) => (
        <MediaCard
          key={`${item.media_type || mediaType}-${item.id}`}
          item={item}
          mediaType={item.media_type || mediaType}
        />
      ))}
      <div ref={sentinel} className="col-12 text-center py-4">
        {isFetching && <p role="status">Loading titles...</p>}
        {query.error && <p role="alert">{query.error.message}</p>}
        {!isFetching && (hasNextPage || isError) && (
          <button
            className="btn btn-outline-light"
            onClick={() => (query.data ? fetchNextPage() : query.refetch())}
          >
            {isError ? "Try again" : "Load more"}
          </button>
        )}
        {!isFetching && !isError && !hasNextPage && (
          <p>{items.length ? "You've reached the end." : emptyMessage}</p>
        )}
      </div>
    </>
  );
}
