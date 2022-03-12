import React from "react";
import fetchClient from "../axiosClient/axiosClient";
import "./registration.css";
import { Link } from "react-router-dom";
import welcomeImg from "./welcome.png";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { green } from "@mui/material/colors";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";

class Registration extends React.Component {
  constructor() {
    super();
    this.state = {
      userName: "",
      email: "",
      password: "",
      re_password: "",
      authCode: "",
      loading: false,
      success: false,
      uploadPercentage: "",
      error: "",
    };
    this.changeEmail = this.changeEmail.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.changeUserName = this.changeUserName.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.changeRePassword = this.changeRePassword.bind(this);
    this.changeAuthCode = this.changeAuthCode.bind(this);
    this.sendAuthCode = this.sendAuthCode.bind(this);
    this.setUploadPercentage = this.setUploadPercentage.bind(this);
    this.checkUserName = this.checkUserName.bind(this);
  }

  async onSubmit(event) {
    event.preventDefault();

    // check password match the pattern or not
    if (
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z'";\-^%$#@!+=_<>,\\.:~`\d]{8,}$/.test(
        this.state.password,
      ) !== true
    ) {
      console.log(
        "Password need to contain at lest one digit or character, please try again.",
      );
      return alert(
        "Password need to contain at lest one digit or character, please try again.",
      );
    }

    if (this.state.password !== this.state.re_password) {
      alert("Password inconsistent, please try again");
    }

    const register = {
      userName: this.state.userName,
      email: this.state.email,
      password: this.state.password,
      re_password: this.state.re_password,
      authCode: this.state.authCode,
    };

    console.log(register);
    // return;

    await fetchClient
      // .post("http://localhost:5000/user/signup", register)
      .post("https://crm4399.herokuapp.com/user/signup", register)
      .then((response) => {
        console.log(response.data);
        if (response.data.status !== false) {
          alert("Thanks for registration!");
          window.location.href = "/";
        } else {
          alert("Wrong Authentication Code, please try again.");
        }
      });

    this.setState({ userName: "", password: "", email: "", re_password: "" });
  }

  changePassword(event) {
    this.setState({
      password: event.target.value,
    });
  }

  changeEmail(event) {
    this.setState({
      email: event.target.value,
    });
  }
  changeUserName(event) {
    this.setState({
      userName: event.target.value,
    });
  }

  changeRePassword(event) {
    this.setState({
      re_password: event.target.value,
    });
  }

  changeAuthCode(event) {
    this.setState({
      authCode: event.target.value,
    });
  }

  setUploadPercentage(value) {
    this.setState({
      uploadPercentage: value,
    });
  }

  async checkUserName() {
    if (this.state.userName === "") {
      this.setState({ error: { msg: "fill the userName", type: "userName" } });
      return;
    }

    const data = {
      userName: this.state.userName,
    };

    await fetchClient
      // .post("http://localhost:5000/user/checkUserName", data)
      .post("https://crm4399.herokuapp.com/user/checkUserName", data)
      .then((response) => {
        console.log(response.data);
        if (response.data.status) {
          this.setState({
            error: { msg: response.data.msg, type: "userName", status: true },
          });
        } else {
          this.setState({
            error: {
              msg: response.data.message,
              type: "userName",
              status: false,
            },
          });
        }
      });
  }

  async sendAuthCode() {
    if (this.state.email === "") {
      this.setState({ error: { msg: "fill the email", type: "email" } });
      return;
    }
    const data = {
      email: this.state.email,
    };
    this.setState({ success: false });
    this.setState({ loading: true });
    await fetchClient
      // .post("http://localhost:5000/user/sendEmailCode", data)
      .post("https://crm4399.herokuapp.com/user/sendEmailCode", data, {
        onUploadProgress: (progressEvent) => {
          this.setState({
            uploadPercentage: parseInt(
              Math.round((progressEvent.loaded * 100) / progressEvent.total),
            ),
          });
        },
      })
      .then((response) => {
        if (response.data.status) {
          setTimeout(() => this.setUploadPercentage(0), 100);

          this.setState({ success: true });
          this.setState({ loading: false });
          this.setState({ error: "" });
        } else {
          alert(response.data);
        }
      });
  }

  render() {
    return (
      <div className="sub-container">
        <div className="registration">
          <img src={welcomeImg} alt="welcomeImg" />
          {this.state.error && this.state.error.type === "uerName" ? (
            <Alert severity="error">{this.state.error.msg}</Alert>
          ) : null}
          <div className="form-div">
            <form onSubmit={this.onSubmit}>
              <label className="form-label">Username</label>
              <div>
                <input
                  type="text"
                  placeholder="Enter prefer userName"
                  onChange={this.changeUserName}
                  value={this.state.userName}
                  className="form-control form-group"
                  required
                />

                <Button variant="contained" onClick={this.checkUserName}>
                  check
                </Button>
              </div>

              {this.state.error &&
              this.state.error.type === "userName" &&
              this.state.error.status ? (
                <Alert severity="success">{this.state.error.msg}</Alert>
              ) : null}

              {this.state.error &&
              this.state.error.type === "userName" &&
              !this.state.error.status ? (
                <Alert severity="error">{this.state.error.msg}</Alert>
              ) : null}

              <label className="form-label">Email</label>
              <input
                type="email"
                placeholder="Please Enter Your Email"
                onChange={this.changeEmail}
                value={this.state.email}
                className="form-control form-group"
                required
              />
              {this.state.error && this.state.error.type === "email" ? (
                <Alert severity="error">{this.state.error.msg}</Alert>
              ) : null}

              <Box
                sx={{
                  m: 1,
                  position: "relative",
                  alignItems: "center",
                  justifyContent: "center",
                  display: "flex",
                  marginTop: 3,
                }}
              >
                <Button
                  variant="contained"
                  sx={
                    this.state.success && {
                      bgcolor: green[500],
                      "&:hover": {
                        bgcolor: green[700],
                      },
                    }
                  }
                  disabled={this.state.loading}
                  onClick={this.sendAuthCode}
                >
                  {this.state.success
                    ? "Successfully sent"
                    : "Send Authentication Code"}
                </Button>
                {this.state.loading && (
                  <CircularProgress
                    value={this.state.uploadPercentage}
                    size={24}
                    sx={{
                      color: green[500],
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      marginTop: "-12px",
                      marginLeft: "-12px",
                    }}
                  />
                )}
              </Box>

              <br />
              <label className="form-label">Authentication Code</label>
              <input
                type="string"
                placeholder="Please check your Email"
                className="form-control form-group"
                value={this.state.authCode}
                maxLength={6}
                minLength={6}
                onChange={this.changeAuthCode}
                required
              />

              <label className="form-label">Password</label>
              <input
                type="password"
                placeholder="Enter Password"
                onChange={this.changePassword}
                value={this.state.password}
                className="form-control form-group"
                required
              />

              <input
                type="password"
                placeholder="Re-enter your password"
                onChange={this.changeRePassword}
                value={this.state.re_password}
                className="form-control form-group"
                required
              />

              <button type="submit" className="btn btn-primary" value="signup">
                Sign Up
              </button>

              <Link to="/login">Already have an account? Login via here!</Link>
              <br />
              <Link to="/login">Forget your password? Click here!</Link>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

export default Registration;
