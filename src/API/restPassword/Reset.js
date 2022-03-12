import React, { useState, useEffect } from "react";
import "./Reset.css";
import axios from "axios";
// import { WindowSharp } from "@mui/icons-material";
import { Link } from "react-router-dom";

// const BASE_URL = "http://localhost:5000/user";
const BASE_URL = "https://crm4399.herokuapp.com/user";

const Reset = () => {
  useEffect(() => {
    document.title = "Rest Password";
  }, []);

  const [codeValidation, setCodeValidation] = useState(false);
  const [codeSend, setCodeSend] = useState(false);
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [userName, setUserName] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [email, setEmail] = useState("");

  const handleSendCode = async (e) => {
    e.preventDefault();

    const data = {
      userName,
    };

    await axios.post(BASE_URL + "/sendResetCode", data).then((response) => {
      if (response.data.status === false) {
        alert(response.data.msg);
        console.log(response.data.msg);
      }

      if (response.data.status === true) {
        setCodeSend(true);
        setEmail(response.data.email);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z'";\-^%$#@!+=_<>,\\.:~`\d]{8,}$/.test(
        password1,
      ) !== true
    ) {
      console.log(
        "Password need to contain at lest one digit or character, please try again.",
      );
      return alert(
        "Password need to contain at lest one digit or character, please try again.",
      );
    }

    if (password1 !== password2) {
      alert("Password inconsistent, please try again");
    }

    const data = {
      userName,
      password: password1,
      codeVerified: "4399CRMVerified",
    };

    await axios.post(BASE_URL + "/resetPassword", data).then((response) => {
      console.log(response.data);
      if (response.data.status === true) {
        alert("Password change succeed! Redirect to Login Page!");
        window.location.href = "/";
      } else {
        alert(response.data.msg);
      }
    });
  };

  const checkCode = async (e) => {
    e.preventDefault();

    const data = {
      authCode,
      email,
    };

    await axios.post(BASE_URL + "/codeValidation", data).then((response) => {
      if (response.data.status === true) {
        setCodeValidation(true);
        setCodeSend(false);
      }

      if (response.data.status === false) {
        alert(response.data.msg);
      }
    });
  };

  return (
    <div className="sub-container">
      <div className="reset-form-container">
        <h1>Reset Your Password</h1>
        {codeValidation === false && codeSend === false && (
          <form onSubmit={handleSendCode}>
            <label>Please Enter your user name:</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
            ></input>
            <input type="submit" value="Send Code"></input>
          </form>
        )}

        {codeSend && (
          <form onSubmit={checkCode}>
            <label>Please Enter your authentication code:</label>
            <input
              type="text"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              required
              minLength={6}
              maxLength={6}
            ></input>
            <input type="submit" value="Check"></input>
          </form>
        )}

        {codeValidation && (
          <form onSubmit={handleSubmit}>
            <label>Please Enter your new password</label>
            <input
              type="password"
              value={password1}
              onChange={(e) => setPassword1(e.target.value)}
              required
              minLength={8}
            ></input>

            <label>Please Re-enter your new password</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              minLength={8}
            ></input>

            <input type="submit" value="Change your password"></input>
          </form>
        )}

        <Link to="/login">Don't have an account? Click here!</Link>
        <br />
        <Link to="/login">Recall your password? Click here!</Link>
      </div>
    </div>
  );
};

export default Reset;
