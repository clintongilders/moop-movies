import React, { useEffect, useState } from 'react';

function ProviderDetails({ movieId }) {
    const [providers, setProviders] = useState(null);

    useEffect(() => {
        if (!movieId) return;
        const fetchProviderDetails = async () => {
            const url = `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?language=en-US`;
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
                    setProviders(data);
                })
                .catch(error => {
                    // Handles network errors or errors thrown in the .then() blocks
                    console.error('There was a problem with the fetch operation:', error);
                });
        };
        fetchProviderDetails();

    }, [movieId]);

    if (!providers || Object.keys(providers).length === 0) return <div>No watch providers found.</div>;


    // Example: Display US providers if available
    const country = 'CA';
    const countryProviders = providers['results'][country];
    let flatrate = countryProviders?.flatrate ?? false;
    let rent = countryProviders?.rent ?? false;
    let buy = countryProviders?.buy ?? false;
    console.log(countryProviders);

    return (
        <div>
            {countryProviders ? (
                <>
                    {countryProviders.flatrate && (
                        <>
                            <h5>Now Streaming:</h5>
                            <div className="container-fluid">
                                <div className="row mb-3">
                                    <div className="col-12 d-flex flex-wrap">

                                        {flatrate.filter(prov => prov.provider_id !== 582 && prov.provider_id !== 2303 && prov.provider_id !== 2304)
                                            .map((prov) => (
                                                <div className="m-2">
                                                    <img src={"https://media.themoviedb.org/t/p/original/" + prov.logo_path} width="48" height="48" alt="Now Streaming on Crave"></img>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    {countryProviders.rent && (
                        <>
                            <h5>Available to Rent:</h5>
                            <div className="container-fluid">
                                <div className="row mb-3">
                                    <div className="col-12 d-flex flex-wrap">

                                        {rent.filter(prov => prov.provider_id !== 582 && prov.provider_id !== 2303 && prov.provider_id !== 2304)
                                            .map((prov) => (
                                                <div className="m-2">
                                                    <img src={"https://media.themoviedb.org/t/p/original/" + prov.logo_path} width="48" height="48" alt="Now Streaming on Crave"></img>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    {countryProviders.buy && (
                        <>
                            <h5>Buy? Why?:</h5>
                            <div className="container-fluid">
                                <div className="row mb-3">
                                    <div className="col-12 d-flex flex-wrap">

                                        {buy.filter(prov => prov.provider_id !== 582 && prov.provider_id !== 2303 && prov.provider_id !== 2304)
                                            .map((prov) => (
                                                <div className="m-2">
                                                    <img src={"https://media.themoviedb.org/t/p/original/" + prov.logo_path} width="48" height="48" alt="Now Streaming on Crave"></img>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>




            ) : (
                <div>No providers available for {country}.</div>
            )}
        </div>
    );
}

export default ProviderDetails;