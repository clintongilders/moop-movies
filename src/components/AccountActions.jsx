import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useApiQuery from "./useApiQuery";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function AccountActions({ mediaType, id }) {
  const { account, mutate, loading } = useAuth();
  const client = useQueryClient();
  const url = `/api/account/states/${mediaType}/${id}`;
  const query = useApiQuery(url, "Unable to load saved status.", {
    enabled: !!account,
    queryKey: ["api", url, account?.id],
  });
  const states = query.data;
  const [mutationError, setError] = useState("");
  const error = mutationError || query.error?.message;
  const [busy, setBusy] = useState(false);
  async function toggle(list) {
    setBusy(true);
    setError("");
    try {
      const enabled = !states[list];
      await mutate(`/api/account/${list}`, {
        media_type: mediaType,
        media_id: Number(id),
        enabled,
      });
      client.setQueryData(["api", url, account?.id], (previous) => ({
        ...previous,
        [list]: enabled,
      }));
      if (list === "watchlist")
        client.invalidateQueries({
          queryKey: ["watchlist-ids", account?.id, mediaType],
        });
      client.invalidateQueries({
        queryKey: ["media", `/api/account/${list}/${mediaType}`],
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return null;
  if (!account)
    return (
      <p>
        <Link to="/account">Sign in with TMDB</Link> to save to your watchlist
        or favourites.
      </p>
    );
  return (
    <div className="my-3">
      <div className="d-flex gap-2 flex-wrap">
        <button
          className="btn btn-outline-light"
          disabled={!states || busy}
          aria-pressed={!!states?.watchlist}
          onClick={() => toggle("watchlist")}
        >
          {states?.watchlist ? "Remove from watchlist" : "Add to watchlist"}
        </button>
        <button
          className="btn btn-outline-light"
          disabled={!states || busy}
          aria-pressed={!!states?.favorite}
          onClick={() => toggle("favorite")}
        >
          {states?.favorite ? "Remove from favourites" : "Add to favourites"}
        </button>
      </div>
      {!states && !error && <p role="status">Loading saved status...</p>}
      {error && (
        <p role="alert">
          {error}{" "}
          {!states && (
            <button
              className="btn btn-outline-light"
              onClick={() => query.refetch()}
            >
              Retry
            </button>
          )}
        </p>
      )}
    </div>
  );
}
