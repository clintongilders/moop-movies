import React, { useCallback, useEffect, useRef, useState } from "react";
import { img_300, unavailable } from "../components/config";
import Pagination from "../components/Pagination";
import MediaType from "../components/MediaType";
import MyVerticallyCenteredModal from "../components/Modal";

const Trending = () => {
  const [state, setState] = useState([]);
  const [page, setPage] = useState(1); // initialised the page state with the initial value of 1
  const [mediaType, setMediaType] = useState("movie");
  const [modalShow, setModalShow] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();

  const fireModal = (id) => {
    setSelectedItemId(id);
    setModalShow(true);
  };

  useEffect(() => {
    const fetchTrending = async () => {
      const url = `https://api.themoviedb.org/3/trending/${mediaType}/day?language=en-US&page=${page}`;
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: 'Bearer ' + process.env.REACT_APP_TMDB_API_RAT
        }
      };

      fetch(url, options)
        .then(response => {
          // 'response' is the Response object from the server
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json(); // Or .text(), .blob(), etc., depending on the content type
        })
        .then(data => {
          // 'data' is the parsed content from the response body (e.g., JSON object)
          console.log(data);
          setState(data.results);
        })
        .catch(error => {
          // Handles network errors or errors thrown in the .then() blocks
          console.error('There was a problem with the fetch operation:', error);
        });
    };
    fetchTrending();
  }, []);

  return (
    <>
      <div className="container">
        <div className="row py-5 my-5">
          <div className="col-12 mt-2 mb-4 fs-1 fw-bold text-decoration-underline head d-flex justify-content-center align-items-center">
            <i className="fas fa-fire mx-4 text-danger"></i>
            <h4 className="fs-2">Trending Today</h4>
            <i className="fas fa-fire mx-4 text-danger"></i>
          </div>
          <MediaType mediaType={mediaType} setMediaType={setMediaType} />
          {state.map((Val) => {
            const {
              name,
              title,
              poster_path,
              first_air_date,
              release_date,
              media_type,
              id,
            } = Val;
            return (
              <>
                <div
                  key={id}
                  className="col-md-3 col-sm-4 py-3 d-flex justify-content-center g-4"
                  id="card"
                  onClick={() => fireModal(id)}
                >
                  <div className="card bg-dark">
                    <img
                      src={
                        poster_path ? `${img_300}/${poster_path}` : unavailable
                      }
                      className="card-img-top pt-3 pb-0 px-3"
                      alt={title}
                    />
                    <div className="card-body">
                      <h5 className="card-title fs-5">
                        {title || name}
                      </h5>
                      <div className="d-flex fs-6 date">
                        <div>{first_air_date || release_date}</div>
                      </div>
                    </div>
                  </div>

                </div>
              </>
            );
          })}
          {loading && <p>Loading...</p>}
          <Pagination page={page} setPage={setPage} />
        </div>
      </div>
      <MyVerticallyCenteredModal
          show={modalShow}
          item={state.find(item => item.id === selectedItemId)}
          onHide={() => setModalShow(false)}
        />
    </>
  );
};

export default Trending;