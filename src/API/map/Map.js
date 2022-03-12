import React, { useEffect } from "react";
import Map1 from "./google_map/map_acmp";
import Heading from "../heading/heading.jsx";
import Navbar from "../nav/Navbar";

const Map = () => {
  // change page title
  useEffect(() => {
    document.title = "Map";
  }, []);

  return (
    <React.Fragment>
      <Navbar />
      <Heading />
      <div className="sub-container">
        <div className="map-container">
          <Map1 />
        </div>
      </div>
    </React.Fragment>
  );
};

export default Map;
