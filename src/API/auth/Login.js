import React, { useState, useEffect } from "react";
// import "bootstrap/dist/css/bootstrap.min.css"
import "./login.css";
import Axios from "axios";
import useAuth from "../../hooks/useAuth";
import welcome from "./welcome.png";
import Error from "../error/Error";
import { Link } from "react-router-dom";
import Typography from '@mui/material/Typography';

Axios.defaults.withCredentials = true;

const Login = () => {
  useEffect(() => {
    document.title = "4399CRM";
  }, []);

  const [username, setUsername] = useState("");

  const [password, setPassword] = useState("");

  // const [loginState, setLoginState] = useState({
  //   status: false,
  //   username: "not login yet",
  // });

  const { loginUser, error } = useAuth();

  if (error) {
    return (
      <div>
        <Error msg={error} />
      </div>
    );
  }

  const handleLogin = async (event) => {
    event.preventDefault();
    let data = { username: username, password: password };
    // console.log("trying to login user :", data.username);
    await loginUser(data);
    localStorage.setItem("userName", username);
    window.location.href = "/";
  };

  // const handleSignup = (event) => {
  //   window.location.href = "/signup";
  // };

  return (
    <div className="sub-container">
      <div className="login-container">
        <img className="welcome-img" src={welcome} alt="welcome logo" />
        <h1>CRM Login</h1>

        <div style={{width: "97%"}}>
          <label style={{ color: "rgb(47, 71, 137)" }}>Username :</label>
          <input
            type="text"
						className='form-control'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div style={{width: "97%"}}>
          <label style={{ color: "rgb(47, 71, 137)" }}>Password :</label>
          <input
            type="password"
						className='form-control'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div style={{ width: "100%" }}>
          <button className="login-btn" type="button" onClick={handleLogin}>
            Login
          </button>
        </div>

        <div style={{ width: "100%" }}>
          <Link to="/signup">
            
              Create a new account!
            
          </Link>
        </div>

        <div style={{ width: "100%", display: "inline" }}>
          Forget password?
          <Link to="/resetPassword">
          <Typography variant="body2">
             Click here!
          </Typography>      
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
