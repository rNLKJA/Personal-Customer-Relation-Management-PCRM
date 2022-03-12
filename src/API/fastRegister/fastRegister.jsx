import React from "react";
import Heading from "../heading/heading";
import Navbar from "../nav/Navbar";
import "./fastRegister.css";
import { useParams } from "react-router-dom";
import Input from "@mui/material/Input";
import fetchClient from "../axiosClient/axiosClient";

export default function FastRegister() {
  const params = useParams();

  React.useEffect(() => {});

  return (
    <React.Fragment>
      <Heading />
      <div className="sub-container">
        <div className="confirm-container">
          <FastRegistrationForm params={params} />
        </div>
      </div>
      <Navbar />
    </React.Fragment>
  );
}

export const FastRegistrationForm = ({ params }) => {
  const [password, setPassword] = React.useState("");
  const [password1, setPassword1] = React.useState("");
  const [userName, setUserName] = React.useState("");

  const onSubmit = async (e) => {
    e.preventDefault();

    passwordValidation(password, password1);

    const data = {
      password,
      re_password: password1,
      userName,
      fastRegisterCode: params.authCode,
      _id: params._id,
    };

    await fetchClient.post("/user/fastRegisterConfirm", data).then((res) => {
      if (res.data.status) {
        alert(res.data.message + "\n" + "Redirect to Login Page");
        window.location.href = "/login";
      } else {
        alert("Unable to complete registration, please try later");
      }
    });
    console.log(data);
  };

  return (
    <React.Fragment>
      <h4>Hi! </h4>
      <p>Welcome to join 4399 CRM,</p>
      <p>please complete the form for registration.</p>
      <form onSubmit={onSubmit}>
        <label for="userName">Please enter your User Name</label>
        <Input
          name="userName"
          className="form-control"
          required={true}
          placeholder="Valid your userName"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        ></Input>

        <button className="btn btn-warning">Check User Name</button>

        <br></br>

        <label for="password">Enter your Password</label>
        <Input
          type="password"
          name="password"
          className="form-control"
          placeholder="Need contain at least one character or digit"
          required={true}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        ></Input>

        <label for="password2">Confirm your password</label>
        <Input
          type="password"
          name="password2"
          className="form-control"
          placeholder="Please re-enter your password"
          required={true}
          value={password1}
          onChange={(e) => setPassword1(e.target.value)}
        ></Input>

        {/* <label for="authCode">Enter Registration Code</label>
        <Input
          type="text"
          className="form-control"
          placeholder="Registration Code"
          value={authCode}
          onChange={(e) => setAutheCode(e.target.value)}
        ></Input> */}

        <button type="submit" className="btn btn-primary">
          Confirm
        </button>
      </form>
    </React.Fragment>
  );
};

export const passwordValidation = (password, password1) => {
  const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z'";\-^%$#@!+=_<>,\\.:~`\d]{8,}$/;
  if (regex.test(password) !== true) {
    return alert(
      "Password need to contain at lest one digit or character, please try again.",
    );
  }

  if (password1 !== password) {
    return alert("Error, two passwords need to be the same");
  }

  if (password.length < 8) {
    return alert("The minimum length of password is 8");
  }
};
