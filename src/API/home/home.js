// import required dependencies
import React, { useEffect } from "react";
import img from "./home-gif.gif";
import "./home.css";
import Navbar from "../nav/Navbar";
import Heading from "../heading/heading.jsx";
// import Container from '@mui/material/Container'

const Home = () => {
  useEffect(() => {
    document.title = "Home Page";
  }, []);
  return (
    <React.Fragment>
      <Heading />
      <Navbar />
      <div className="sub-container">
        <div className="home">
          <React.Fragment>
            <img title="home-gif" src={img} width="50%" alt="" />
            <p style={{ fontFamily: "Astloch" }}>Enjoy Your Day!</p>
          </React.Fragment>
        </div>
      </div>
    </React.Fragment>
  );
};

export default Home;
