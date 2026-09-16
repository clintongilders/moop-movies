import React from 'react';
import { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { useEffect } from 'react';
import ProviderDetails from './ProviderDetails';
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import '../circular-progress-bar.css'
import ProgressProvider from "./ProgressProvider";

function toHoursAndMinutes(totalMinutes) {
    if (totalMinutes < 120) return String(totalMinutes) + 'm';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return String(hours) + 'h ' + String(minutes) + 'm';
}

export default function MyVerticallyCenteredModal(props) {
    const { show, item } = props;
    const { media_type, id } = item || {};
    const [details, setDetails] = useState([]);

    useEffect(() => {
        if (!show) return;
        const fetchItemDetails = async () => {
            const url = `https://api.themoviedb.org/3/${media_type}/${id}?language=en-US`;
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
                    setDetails(data);
                })
                .catch(error => {
                    // Handles network errors or errors thrown in the .then() blocks
                    console.error('There was a problem with the fetch operation:', error);
                });
        };
        fetchItemDetails();

    }, [item]);
    console.log("details", details)

    details.year = new Date(details.release_date || details.first_air_date).getFullYear();
    return (
        <Modal
            {...props}
            size="md"
            aria-labelledby="contained-modal-title-vcenter"
            centered
        >
            <Modal.Header closeButton>
            </Modal.Header>
            <Modal.Body>
                <div className="movie-title"><strong>{details.title || details.name}</strong> <span class="title-year">({details.year})</span></div>
                <div className="tiny-text light-text pb-1">
                  {details.genres && details.genres.map(item => item.name).join(', ')} • {toHoursAndMinutes(details.runtime)} • 
                </div>
                <div className="tiny-text light-text"><i>{details.tagline}</i></div>
                <div className="container">
                    <div className="row">
                        <div className="col-md-12 col-sm-12 d-flex justify-content-center pt-1 pb-1 g-0">
                            <p>
                                <Rating>
                                    <ProgressProvider valueStart={0} valueEnd={Math.round(details.vote_average)}>
                                        {value => <CircularProgressbar value={Math.round(details.vote_average * 10)} text={`${Math.round(details.vote_average)}/10`} />}
                                    </ProgressProvider>
                                </Rating>
                                {details.overview}
                            </p>
                        </div>
                    </div>
                </div>
                <ProviderDetails movieId={id} />
            </Modal.Body>
            <Modal.Footer>

            </Modal.Footer>
        </Modal>
    );
}

function Rating(props) {
    return (
        <div className={"float-end pt-3 ps-1 pe-1"}>
            <div style={{ marginTop: 0, display: "flex" }}>
                <div style={{ width: 75 }}>{props.children}</div>
            </div>
        </div>
    );
}