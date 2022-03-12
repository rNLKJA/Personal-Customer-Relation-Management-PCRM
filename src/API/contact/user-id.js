import React, { useState} from "react";
import "./contact.css";
import fetchClient from "../axiosClient/axiosClient";
// import qr_code from "./qr-code.png";
// import hand_write from "./notes.png";
import Heading from "../heading/heading.jsx";
import NavBar from "../nav/Navbar";
import { Link } from "react-router-dom";
import "./user-id.css";

const AddUser = () => {
  // const [contact, setContact] = useState({ userName: "" });
  const [userName, setUserName] = useState("");
  const BASE_URL = "https://crm4399.herokuapp.com";
  // const BASE_URL = "http://localhost:5000";

  const submitUserID = async (e) => {
    e.preventDefault();

    const contact = {
      userName,
    };

    await fetchClient
      .post(BASE_URL + "/contact/createContactByUserName", contact)
      .then((res) => {
        if (res.data.status) {
          alert(`You add a new Contact!`);
        } else {
          alert(`Something wrong, here is the error message:\n${res.data.msg}`);
        }
      })
      .catch((err) => {
        console.error(err);
      });

    setUserName("");
  };

  return (
    <React.Fragment>
      <Heading />
      <NavBar />
      <div className="sub-container">
        <Link to="/addUser">
          <button className="back-button">Back</button>
        </Link>
        <div className="add-by-userName">
          <h1>Add Contact by User Name</h1>
          <form className="newID" method="POST" onSubmit={submitUserID}>
            <input
              name="firstName"
              className="form-control"
              type="text"
              placeholder="Please enter the User Name"
              onChange={(e) => setUserName(e.target.value)}
              value={userName}
              required
            />
            <button type="submit" className="btn btn-primary">
              Add Contact
            </button>
            <br />
          </form>
        </div>
      </div>
    </React.Fragment>
  );
};

export default AddUser;
