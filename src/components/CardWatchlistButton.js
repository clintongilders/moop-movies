import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function CardWatchlistButton({ item, mediaType }) {
  const { account, loading, mutate } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(!!account);
  const [statusError, setStatusError] = useState(false);
  const [retry, setRetry] = useState(0);
  const title = item.title || item.name;
  useEffect(() => {
    const controller = new AbortController();
    setSaved(false);
    setStatusError(false);
    setError("");
    setChecking(!!account);
    if (!account) return () => controller.abort();
    fetch(`/api/account/states/${mediaType}/${item.id}`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Unable to load watchlist status.');
        return response.json();
      })
      .then(data => { if (!controller.signal.aborted) setSaved(!!data.watchlist); })
      .catch(error => {
        if (!controller.signal.aborted) { setError(error.message); setStatusError(true); }
      })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [account, mediaType, item.id, retry]);
  async function add() {
    if (busy || checking || saved) return;
    if (statusError) { setRetry(previous => previous + 1); return; }
    if (!account) { navigate('/account'); return; }
    setBusy(true); setError("");
    try {
      // An explicit add is idempotent, including titles already saved on TMDB.
      await mutate('/api/account/watchlist', { media_type: mediaType, media_id: item.id, enabled: true });
      setSaved(true);
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  const label = checking ? `Loading watchlist status for ${title}` : statusError ? `Retry watchlist status for ${title}` : saved ? `${title} added to watchlist` : account ? `Add ${title} to watchlist` : `Sign in to add ${title} to watchlist`;
  return <>
    <button type="button" className={`card-watchlist${saved ? " is-saved" : ""}`} aria-label={label} title={label} disabled={loading || checking || busy || saved} onClick={add}>
      <span aria-hidden="true">{busy || checking ? "…" : statusError ? "↻" : saved ? "✓" : "+"}</span>
    </button>
    {saved && <span className="visually-hidden" role="status">{title} added to watchlist.</span>}
    {error && <p className="card-watchlist-error" role="alert">{error} {statusError ? 'Tap ↻ to retry.' : 'Tap + to retry.'}</p>}
  </>;
}
