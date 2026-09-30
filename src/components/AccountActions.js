import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function AccountActions({ mediaType, id }) {
  const { account, mutate, loading } = useAuth();
  const [states, setStates] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!account) return;
    const controller = new AbortController();
    setStates(null); setError('');
    fetch(`/api/account/states/${mediaType}/${id}`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Unable to load saved status.'); return response.json(); })
      .then(data => { if (!controller.signal.aborted) setStates(data); })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [account, mediaType, id, retry]);
  async function toggle(list) {
    setBusy(true); setError('');
    try {
      const enabled = !states[list];
      await mutate(`/api/account/${list}`, { media_type: mediaType, media_id: Number(id), enabled });
      setStates(previous => ({ ...previous, [list]: enabled }));
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  if (loading) return null;
  if (!account) return <p><Link to="/account">Sign in with TMDB</Link> to save to your watchlist or favourites.</p>;
  return <div className="my-3">
    <div className="d-flex gap-2 flex-wrap">
      <button className="btn btn-outline-light" disabled={!states || busy} aria-pressed={!!states?.watchlist} onClick={() => toggle('watchlist')}>{states?.watchlist ? 'Remove from watchlist' : 'Add to watchlist'}</button>
      <button className="btn btn-outline-light" disabled={!states || busy} aria-pressed={!!states?.favorite} onClick={() => toggle('favorite')}>{states?.favorite ? 'Remove from favourites' : 'Add to favourites'}</button>
    </div>
    {!states && !error && <p role="status">Loading saved status...</p>}
    {error && <p role="alert">{error} {!states && <button className="btn btn-outline-light" onClick={() => setRetry(previous => previous + 1)}>Retry</button>}</p>}
  </div>;
}
