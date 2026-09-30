import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import InfiniteMediaList from '../components/InfiniteMediaList';

export default function Account() {
  const { account, loading, error, refresh, mutate } = useAuth();
  const [params] = useSearchParams();
  const [list, setList] = useState('watchlist');
  const [type, setType] = useState('movie');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function connect() {
    setBusy(true); setMessage('');
    try { const data = await mutate('/api/auth/start'); window.location.assign(data.url); }
    catch (error) { setMessage(error.message); setBusy(false); }
  }
  async function logout() {
    setBusy(true); setMessage('');
    try { await mutate('/api/auth/logout'); await refresh(); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  const endpoint = `/api/account/${list}/${type}`;
  return <main className="container py-5 my-5">
    <h1>My TMDB account</h1>
    {loading ? <p role="status">Loading account...</p> : error ? <><p role="alert">{error}</p><button className="btn btn-outline-light" onClick={refresh}>Retry</button></> : account ? <>
      <div className="d-flex align-items-center gap-3 flex-wrap mb-4">
        <p className="mb-0">Signed in as <strong>{account.username}</strong></p>
        <button className="btn btn-outline-light" disabled={busy} onClick={logout}>Sign out</button>
      </div>
      <div className="d-flex gap-3 flex-wrap mb-4">
        <label>List<select className="form-select mt-1" value={list} onChange={event => setList(event.target.value)}><option value="watchlist">Watchlist</option><option value="favorite">Favourites</option></select></label>
        <label>Type<select className="form-select mt-1" value={type} onChange={event => setType(event.target.value)}><option value="movie">Movies</option><option value="tv">TV shows</option></select></label>
      </div>
      <div className="row"><InfiniteMediaList key={`${account.id}-${endpoint}`} endpoint={endpoint} mediaType={type} emptyMessage="Nothing saved here yet. Open a title to add it." /></div>
    </> : <>
      <p>Connect your TMDB account to manage your watchlist and favourites.</p>
      {params.get('auth') && <p role="alert">{params.get('auth') === 'denied' ? 'TMDB access was not approved.' : 'Sign-in could not be completed. Please try again.'}</p>}
      <button className="btn btn-light" disabled={busy} onClick={connect}>{busy ? 'Connecting…' : 'Sign in with TMDB'}</button>
      <p className="small mt-3">You’ll sign in and approve access on TMDB.</p>
    </>}
    {message && <p role="alert" className="mt-3">{message}</p>}
  </main>;
}
