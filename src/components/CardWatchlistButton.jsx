import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";

export default function CardWatchlistButton({ item, mediaType }) {
  const { account, loading, mutate, refresh } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const key = ["watchlist-ids", account?.id, mediaType];
  const status = useQuery({
    queryKey: key,
    enabled: !!account,
    staleTime: 60000,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/account/watchlist-ids/${mediaType}`, {
        signal,
      });
      if (!response.ok) {
        const error = new Error("Unable to load watchlist status.");
        error.status = response.status;
        throw error;
      }
      return response.json();
    },
  });
  useEffect(() => {
    if (status.error?.status === 401) refresh?.();
  }, [status.error, refresh]);
  const saved = !!status.data?.ids?.includes(item.id);
  const checking = !!account && status.isPending;
  const statusError = !!account && status.isError;
  const [busy, setBusy] = useState(false);
  const [mutationError, setError] = useState("");
  const error = mutationError || (statusError ? status.error.message : "");
  const title = item.title || item.name;
  async function add() {
    if (busy || checking || saved) return;
    if (statusError) {
      status.refetch();
      return;
    }
    if (!account) {
      navigate("/account");
      return;
    }
    setBusy(true);
    setError("");
    try {
      // An explicit add is idempotent, including titles already saved on TMDB.
      await mutate("/api/account/watchlist", {
        media_type: mediaType,
        media_id: item.id,
        enabled: true,
      });
      client.setQueryData(key, (previous) => ({
        ids: [...new Set([...(previous?.ids || []), item.id])],
      }));
      client.setQueryData(
        ["api", `/api/account/states/${mediaType}/${item.id}`, account.id],
        (previous) => previous && { ...previous, watchlist: true },
      );
      client.invalidateQueries({
        queryKey: ["media", `/api/account/watchlist/${mediaType}`],
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  const label = checking
    ? `Loading watchlist status for ${title}`
    : statusError
      ? `Retry watchlist status for ${title}`
      : saved
        ? `${title} added to watchlist`
        : account
          ? `Add ${title} to watchlist`
          : `Sign in to add ${title} to watchlist`;
  return (
    <>
      <button
        type="button"
        className={`card-watchlist${saved ? " is-saved" : ""}`}
        aria-label={label}
        title={label}
        disabled={loading || checking || busy || saved}
        onClick={add}
      >
        <span aria-hidden="true">
          {busy || checking ? "…" : statusError ? "↻" : saved ? "✓" : "+"}
        </span>
      </button>
      {saved && (
        <span className="visually-hidden" role="status">
          {title} added to watchlist.
        </span>
      )}
      {error && (
        <p className="card-watchlist-error" role="alert">
          {error} {statusError ? "Tap ↻ to retry." : "Tap + to retry."}
        </p>
      )}
    </>
  );
}
