import React from "react";
import "./UpdatePassword.css"; // import required css
import fetchClient from "../axiosClient/axiosClient";
import { useState } from "react";
// import { WindowOutlined } from "@mui/icons-material";

const UpdatePassword = ({ email }) => {
  const [newPassword1, setNewPassword1] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [authCode, setAuthCode] = useState("");

  const sendAuthCode = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    const data = {
      email: email,
    };
    await fetchClient
      // .post("http://localhost:5000/user/sendEmailcode", data)
      .post("https://crm4399.herokuapp.com/user/sendEmailcode", data)
      .then((response) => {
        if (response.data.status) {
        } else {
          alert(response.data);
        }
      });
  };

  const HandleSubmit = async (e) => {
    e.preventDefault();

    // check password1 match password2
    if (newPassword1 !== newPassword2) {
      alert("Password In consistent, please re-enter your new password.");
      console.log("Password In consistent, please re-enter your new password.");
      return;
    }

    // check password match the pattern or not
    if (
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z'";\-^%$#@!+=_<>,\\.:~`\d]{8,}$/.test(
        newPassword1,
      ) !== true
    ) {
      console.log(
        "Password need to contain at lest one digit or character, please try again.",
      );
      return alert(
        "Password need to contain at lest one digit or character, please try again.",
      );
    }

    const data = {
      email,
      newPassword1,
      authCode,
    };

    await fetchClient
      // .post("http://localhost:5000/user/changePassword", data)
      .post("https://crm4399.herokuapp.com/user/changePassword", data)
      .then((response) => {
        console.log(response);
        if (response.data.status) {
          alert("You've changed your password!");
          console.log("Password Changed");
          window.location.href = "/setting";
        } else if (!response.status) {
          alert("Update failed.");
        }
      });
  };

  return (
    <React.Fragment>
      <form
        className="updated password"
        style={{ paddingTop: "20px" }}
        onSubmit={HandleSubmit}
      >
        <label>Please Enter Your NEW Password</label>
        <input
          type="password"
          name="password"
          required
          value={newPassword1}
          minLength={8}
          onChange={(e) => setNewPassword1(e.target.value)}
        ></input>
        <label>Please Re-enter Your NEW Password</label>
        <input
          type="password"
          name="re-password"
          required
          minLength={8}
          value={newPassword2}
          onChange={(e) => setNewPassword2(e.target.value)}
        ></input>

        <button
          style={{ width: "97%", marginTop: "20px", marginBottom: "20px" }}
          onClick={sendAuthCode}
        >
          Send Authentication Code
        </button>

        <label>Please Enter Your Authentication Code</label>
        <input
          type="string"
          maxLength={6}
          minLength={6}
          required
          value={authCode}
          onChange={(e) => setAuthCode(e.target.value)}
        ></input>

        <button
          type="submit"
          style={{ width: "97%", marginTop: "20px", marginBottom: "20px" }}
        >
          Submit
        </button>
      </form>
    </React.Fragment>
  );
};

export default UpdatePassword;
