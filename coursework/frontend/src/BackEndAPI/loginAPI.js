// import { useState, useEffect } from "react";

// import axios from "axios";
// const BASE_URL = "https://crm4399.herokuapp.com";

// /**
//  * this function will post to back end and let user login to web
//  * @param {JSON} user this json contain the informtion for user to login
//  * @returns {JSON} this contain JWT token
//  */
// async function loginUser(user) {
//   const { userName, password } = user;

//   if (!userName || !password) {
//     alert("must provide an email and a password");
//     return;
//   }

//   const endpoint = BASE_URL + "/user/login";

//   let data = await axios(endpoint, {
//     userName: userName,
//     password: password,
//   }).then((res) => res.data);
// }
