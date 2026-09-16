import React, { useState } from "react";


const MediaType = ({ mediaType, setMediaType }) => {
  const baseButtonClasses = "bg-dark text-white px-4 py-2 text-center button"
  const [litPos, setLitPos] = useState(0);
  function handleButtonClick(type, id) {
    setLitPos(litPos === 0 ? -1 : id) 
    setMediaType(type)
  }

  return (
    <>
      <div className="container-fluid">
        <div className="row mb-3">
          <div className="col-12 d-flex flex-wrap">
            <div className="m-2">
              <button id="movie" className={litPos === 0 ? baseButtonClasses + ' buttons' : baseButtonClasses} onClick={() => handleButtonClick('movie', 0)}>Movies</button>
            </div>
            <div className="m-2">
              <button id="tv" className={litPos === 1 ? baseButtonClasses +  ' buttons' : baseButtonClasses} onClick={() => handleButtonClick('tv', 1)}>TV Shows</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MediaType;
