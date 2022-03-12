import React, { useEffect } from "react";
import "./contact.css";
// import NavBar from "../nav/navbar-addContact";
import { Link } from "react-router-dom";
import NavBarBottom from "../nav/Navbar";
import Heading from "../heading/heading.jsx";
import "../nav/contactNav.css";
import qr_code from "../nav/qr-code.png";
import hand_write from "../nav/notes.png";
import user from "../nav/user.png";

const AddUser = () => {
  useEffect(() => {
    document.title = "Add a new Contact";
  }, []);
  return (
    <React.Fragment>
      <Heading />
      <div className="sub-container">
				<Link to="/contact">
					<button className='back-button-add'>
						Back
					</button>
				</Link>
        <div className="add-contact-container">
          {/* link to contact route */}
          <Link to="/addUser/qr-code" style={{ width: "90%"}}>
            <div className="block">
              <div className="inner">
                <img src={qr_code} alt="qr-code"></img>
              </div>
              <div className="inner">
                <h1 style={{ display: "inline" }}>Scan QR Code</h1>
              </div>
            </div>
          </Link>

          <Link to="/addUser/user-id" style={{ width: "90%" }}>
            <div className="block">
              <div className="inner">
                <img src={user} alt="manual input"></img>
              </div>
              <div className="inner">
                <h1 style={{ display: "inline", color: "brown" }}>
                  Search By User Id
                </h1>
              </div>
            </div>
          </Link>

          <Link to="/addUser/manual-input" style={{ width: "90%" }}>
            <div className="block">
              <div className="inner">
                <img src={hand_write} alt="manual input"></img>
              </div>
              <div className="inner">
                <h1 style={{ display: "inline", color: "orange" }}>
                  Manual Input
                </h1>
              </div>
            </div>
          </Link>
        </div>
      </div>
      <NavBarBottom />
    </React.Fragment>
  );
};

export default AddUser;
