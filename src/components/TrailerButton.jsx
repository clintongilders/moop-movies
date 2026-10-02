import React, { useState } from "react";
import useApiQuery from "./useApiQuery";
import Modal from "react-bootstrap/Modal";

export default function TrailerButton({ mediaType, id, title, videos }) {
  const [show, setShow] = useState(false);
  const query = useApiQuery(
    `/api/tmdb/${mediaType}/${id}/videos`,
    "Unable to load the trailer. Please try again.",
    { enabled: show && !videos, initialData: videos },
  );
  const loading = show && query.isPending;
  const error = query.error?.message;
  const trailers = (query.data?.results || []).filter(
    (video) =>
      video.site === "YouTube" &&
      video.type === "Trailer" &&
      /^[\w-]{11}$/.test(video.key),
  );
  const trailer =
    trailers.find((video) => video.official) || trailers[0] || null;

  return (
    <>
      <button className="btn btn-light mb-3" onClick={() => setShow(true)}>
        ▶ Play trailer
      </button>
      <Modal
        show={show}
        onHide={() => setShow(false)}
        centered
        size="lg"
        aria-labelledby="trailer-title"
        contentClassName="bg-dark text-white"
      >
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title id="trailer-title">{title} — Trailer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading ? (
            <p role="status">Loading trailer...</p>
          ) : error ? (
            <>
              <p role="alert">{error}</p>
              <button
                className="btn btn-outline-light"
                onClick={() => query.refetch()}
              >
                Retry
              </button>
            </>
          ) : trailer ? (
            <>
              {show && (
                <div className="ratio ratio-16x9">
                  <iframe
                    title={`${title} trailer`}
                    referrerPolicy="strict-origin-when-cross-origin"
                    src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1`}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                </div>
              )}
              <a
                className="link-light d-inline-block mt-3"
                href={`https://www.youtube.com/watch?v=${trailer.key}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Watch on YouTube
              </a>
            </>
          ) : (
            <p>No trailer is available for this title.</p>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
