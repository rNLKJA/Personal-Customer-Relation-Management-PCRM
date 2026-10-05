import { useState } from "react";
// import { useHistory } from 'react-router-dom';
// import axios from 'axios';

import fetchClient from "../API/axiosClient/axiosClient";
export default function useAuth() {
  const BASE_URL = "https://crm4399.herokuapp.com";

  const [error, setError] = useState(null);

  //login user
  const loginUser = async (data) => {
    const { username, password } = data;
    // console.log("loging user");
    return fetchClient
      .post(BASE_URL + "/user/login", {
        userName: username,
        password: password,
      })
      .then((res) => {
        if (res.data.auth) {
          // console.log(res.data.token);
          window.localStorage.setItem("jwt", res.data.token);
        } else {
          alert("login failed");
        }
      })
      .catch((err) => {
        setError(err);
      });
  };

  return {
    loginUser,
    error,
  };
}
