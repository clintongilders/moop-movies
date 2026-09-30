import React, { useEffect, useState } from 'react';
import Modal from 'react-bootstrap/Modal';

export default function TrailerButton({ mediaType, id, title }) {
  const [show, setShow] = useState(false);
  const [trailer, setTrailer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!show) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setTrailer(null);
    async function load() {
      try {
        const response = await fetch(`/api/tmdb/${mediaType}/${id}/videos`, { signal: controller.signal });
        if (!response.ok) throw new Error('Unable to load the trailer. Please try again.');
        const data = await response.json();
        const trailers = (data.results || []).filter(video => video.site === 'YouTube' && video.type === 'Trailer' && /^[\w-]{11}$/.test(video.key));
        const selected = trailers.find(video => video.official) || trailers[0] || null;
        if (!controller.signal.aborted) setTrailer(selected);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [show, mediaType, id, retry]);

  return <>
    <button className="btn btn-light mb-3" onClick={() => setShow(true)}>▶ Play trailer</button>
    <Modal show={show} onHide={() => setShow(false)} centered size="lg" aria-labelledby="trailer-title" contentClassName="bg-dark text-white">
      <Modal.Header closeButton closeVariant="white">
        <Modal.Title id="trailer-title">{title} — Trailer</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? <p role="status">Loading trailer...</p> : error ? <>
          <p role="alert">{error}</p>
          <button className="btn btn-outline-light" onClick={() => setRetry(value => value + 1)}>Retry</button>
        </> : trailer ? <>
          {show && <div className="ratio ratio-16x9">
            <iframe title={`${title} trailer`} src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
          </div>}
        </> : <p>No trailer is available for this title.</p>}
      </Modal.Body>
    </Modal>
  </>;
}
