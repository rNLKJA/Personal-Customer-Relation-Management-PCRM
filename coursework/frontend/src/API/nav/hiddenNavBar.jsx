// import required dependencies
import React from "react";
import { Link } from "react-router-dom";

// define navigation bar component
const Navbar = () => {
  return (
    <nav className="hidden-nav" style={{ display: "none" }}>
      <Link to="/"></Link>
      <Link to="/login"></Link>
      <Link to="/signup"></Link>
      <Link to="/resetPassword"></Link>
      <Link to="/contact"></Link>
      <Link to="/record"></Link>
      <Link to="/createRecord"></Link>
      <Link to="/addUser"></Link>
      <Link to="/addUser/qr-code"></Link>
      <Link to="/addUser/manual-input"></Link>
      <Link to="/addUser/user-id"></Link>
      <Link to="/map"></Link>
      <Link to="/setting"></Link>
    </nav>
  );
};

export default Navbar;
