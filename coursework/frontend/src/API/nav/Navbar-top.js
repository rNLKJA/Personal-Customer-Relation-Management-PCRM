import React from "react";
import { Link } from "react-router-dom";

const NavbarTop = () => {
  return (
    <nav>
      <div className="navbar-top">
        <Link to="/">
          <img
            className="navbar-top-img"
            src={require("./logo.png")}
            alt="back to home page"
          ></img>
        </Link>
      </div>
    </nav>
  );
};

export default NavbarTop;
