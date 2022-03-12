// import required dependencies
import React from "react";
import { Link } from "react-router-dom";
import settingIMG from "./icon/set.png";
import contactIMG from "./icon/contact.png";
import recordIMG from "./icon/record.png";
import mapIMG from "./icon/map.png";

// define navigation bar component
const Navbar = () => {
  return (
    <nav className="main-nav">
      <h1 data-testid="4399" hidden>
        4399 CRM
      </h1>
      <div className="navbar">
        {/* link to contact route */}
        <Link to="/contact" id="contact-icon">
          <img
            className="nav-icon"
            data_testid="contact_icon"
            src={contactIMG}
            alt="contact-icon"
          />
        </Link>
      </div>

      {/* link to records route */}
      <div className="navbar">
        <Link to="/record" id="record-icon">
          <img className="nav-icon" src={recordIMG} alt="record-icon" />
        </Link>
      </div>

      {/* link to map route */}
      <div className="navbar">
        <Link to="/map" id="map-icon">
          <img className="nav-icon" src={mapIMG} alt="map-icon" />
        </Link>
      </div>

      {/* link to personal setting route */}
      <div className="navbar">
        <Link to="/setting" id="set-icon">
          <img className="nav-icon" src={settingIMG} alt="set-icon" />
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
