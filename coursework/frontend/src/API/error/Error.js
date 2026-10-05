import React from "react";
// import { useState, useEffect } from "react";
// import { Redirect } from "react-router-dom";
import "./error.css";

const Error = ({ msg }) => {
  return (
    <div className="sub-container">
      <div className="error">
        <p>Opps, Error Occured</p>
        <p>(✖ ´ ╹ ‸ ╹ ` ✖)</p>
        <p>{msg}</p>
      </div>
    </div>
  );
};

export default Error;
