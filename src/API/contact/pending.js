import React from "react";
// import { useState, useEffect } from "react";
// import { Redirect } from "react-router-dom";
import "./pending.css";

const pending = ({ msg }) => {
  return (
    <div className="pending" style={{ height: "300px" }}>
      <p>AWAITING</p>
      <p>(´ ｡ • ᵕ • ｡ `)</p>
      <p>{msg}</p>
    </div>
  );
};

export default pending;
