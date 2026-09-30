import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function CardWatchlistButton({ item, mediaType }) {
  const { account, loading, mutate } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = item.title || item.name;
  async function add() {
    if (busy || saved) return;
    if (!account) { navigate('/account'); return; }
    setBusy(true); setError("");
    try {
      // An explicit add is idempotent, including titles already saved on TMDB.
      await mutate('/api/account/watchlist', { media_type: mediaType, media_id: item.id, enabled: true });
      setSaved(true);
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  const label = saved ? `${title} added to watchlist` : account ? `Add ${title} to watchlist` : `Sign in to add ${title} to watchlist`;
  return <>
    <button type="button" className={`card-watchlist${saved ? " is-saved" : ""}`} aria-label={label} title={label} disabled={loading || busy || saved} onClick={add}>
      <span aria-hidden="true">{busy ? "…" : saved ? "✓" : "+"}</span>
    </button>
    {saved && <span className="visually-hidden" role="status">{title} added to watchlist.</span>}
    {error && <p className="card-watchlist-error" role="alert">{error} Tap + to retry.</p>}
  </>;
}
