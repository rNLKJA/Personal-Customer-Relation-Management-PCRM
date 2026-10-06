// import required dependencies
import React from "react";
import { useState, useCallback } from "react";
import GoogleMapReact from "google-map-react";
import marker from "./google-maps.png";
// import { Slider } from "@material-ui/core";

// set marker
const Marker = ({ text }) => {
  return (
    <div className="marker">
      <div>
        {/* this marker image was downloaded from the internet */}
        <img src={marker} alt="marker" className="marker" />
        {/* set displayed text */}
        <p>{text}</p>
      </div>
    </div>
  );
};

// create google map api
const Map = React.memo(() => {
  // set default geometry information
  const [coords, setCoords] = useState({
    lat: -37.7982,
    lng: 144.961,
    desp: "The University of Melbourne",
  });

  // default display information
  const defaultProps = {
    center: {
      lat: coords.lat,
      lng: coords.lng,
    },
    zoom: 14,
  };

  // handle change geolocation info
  const handleChange = useCallback(
    (e) => {
      // obtain the targe name and its value
      const name = e.target.name;
      const value = e.target.value;

      // change the geolocation valeu
      setCoords({ ...coords, [name]: value });
    },
    [coords]
  );

  // handle geolocation update function
  const handleSubmit = (event) => {
    // prevent web page auto refresh
    event.preventDefault();
  };

  // render the map API
  return (
    // Important! Always set the container height explicitly
    <div className="map-container">
      <div className="google-map-1">
        {/* google map api connection setup */}
        <GoogleMapReact
          bootstrapURLKeys={{ key: "AIza-REMOVED-API-KEY" }}
          defaultCenter={defaultProps.center}
          defaultZoom={defaultProps.zoom}
        >
          <Marker lat={coords.lat} lng={coords.lng} text={coords.desp} />
        </GoogleMapReact>
      </div>
      <form className="form">
        <div className="form-control">
          <label htmlFor="latitude">Latitude: </label>
          <input
            id="latitude"
            type="number"
            name="lat"
            value={coords.lat}
            step="0.0001"
            onChange={handleChange}
          ></input>
        </div>

        <div className="form-control">
          <label htmlFor="longitude">Longitude: </label>
          <input
            id="longitude"
            type="number"
            name="lng"
            value={coords.lng}
            step="0.0001"
            onChange={handleChange}
          ></input>
        </div>

        <div className="form-control">
          <label htmlFor="description">Description: </label>
          <input
            id="description"
            type="text"
            name="desp"
            value={coords.desp}
            onChange={handleChange}
          ></input>
        </div>

        {/* this submit buttom will update the geolocation */}
        <button type="submit" className="btn" onClick={handleSubmit}>
          Change Location
        </button>
      </form>
    </div>
  );
});

export default Map;
