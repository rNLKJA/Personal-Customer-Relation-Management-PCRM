import { useState, useEffect } from "react";
import fetchClient from "../API/axiosClient/axiosClient";

import axios from "axios";
const BASE_URL = "https://crm4399.herokuapp.com";

axios.defaults.withCredentials = true;

// function editProfile(profile) {
//   const endpoint = BASE_URL + "/profile/editProfile";
//   return fetchClient.post(endpoint, profile).then((res) => res.data);
// }

/**
 * Back-End API: edit the lastName of client
 * @param {JSON} lastName - the lastName of client
 * @return {JSON} res - response from the back-end server.
 */
// function editLastName(lastName) {
//   const endpoint = BASE_URL + "/profile/editLastName";
//   return fetchClient.post(endpoint, lastName).then((res) => res.data);
// }

/**
 * Back-End API: edit the occupation of client
 * @param {JSON} occupation - the occupation of client
 * @return {JSON} res - response from the back-end server.
 */
// function editOccupation(occupation) {
//   const endpoint = BASE_URL + "/profile/editOccupation";
//   return fetchClient.post(endpoint, occupation).then((res) => res.data);
// }

/**
 * Back-End API: edit the status of client
 * @param {JSON} status - the status of client
 * @return {JSON} res - response from the back-end server.
 */
// function editStatus(status) {
//   const endpoint = BASE_URL + "/profile/editStatus";
//   return fetchClient.post(endpoint, status).then((res) => res.data);
// }

/**
 * Back-End API: show profile
 * @return {JSON} res - response from the back-end server.
 */
function showProfile() {
  const endpoint = BASE_URL + "/profile/showProfile";
  return fetchClient.get(endpoint).then((res) => res.data);
}

/**
 * Back-End API: add a phone to profile
 * @param {JSON} phone - the phone number of client
 * @return {JSON} res - response from the back-end server.
 */
// function addPhone(phone) {
//   const endpoint = BASE_URL + "/profile/addPhone";
//   return fetchClient.post(endpoint, phone).then((res) => res.data);
// }

/**
 * Back-End API: del a phone to profile
 * @param {JSON} phone - the phone number of client
 * @return {JSON} res - response from the back-end server.
 */
// function delPhone(phone) {
//   const endpoint = BASE_URL + "/profile/delPhone";
//   return fetchClient.post(endpoint, phone).then((res) => res.data);
// }

/**
 * Back-End API: add a email to profile
 * @param {JSON} email - the email address of client
 * @return {JSON} res - response from the back-end server.
 */
// function addEmail(email) {
//   const endpoint = BASE_URL + "/profile/addEmail";
//   return fetchClient.post(endpoint, email).then((res) => res.data);
// }

/**
 * Back-End API: delete a email to profile
 * @param {JSON} email - the email address of client
 * @return {JSON} res - response from the back-end server.
 */
// function delEmail(email) {
//   const endpoint = BASE_URL + "/profile/delEmail";
//   return fetchClient.post(endpoint, email).then((res) => res.data);
// }

/**
 * React_Use_Function: use show profile function
 */
export function useShowProfile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    // console.log(showProfile());
    showProfile()
      .then((profile) => {
        setProfile(profile);
        setLoading(false);
      })
      .catch((e) => {
        console.log(e);
        setError(e);
        setLoading(false);
      });
  }, []);

  return {
    loading,
    profile,
    error,
  };
}

// export function useeditFirstName() {

//   const [firstName, setFirstName] = useState("");

//   function onSubmit() {
//     editFirstName({
//       firstName: firstName,

//     });
//   }
//   return;
// }

// export function useeditLastName() {

//   const [lastName, setLastName] = useState("");

//   function onSubmit() {
//     editLastName({
//       lastName: lastName,

//     });
//   }
//   return;

// }

// export function useeditOccupation() {
//   const [occupation, setOccupation] = useState("");

//   function onSubmit() {
//     editOccupation({
//       occupation: occupation,

//     });
//   }
//   return;
// }

// export function useeditStatus() {
//   const [status, setStatus] = useState("");

//   function onSubmit() {
//     editStatus({
//       status: status,

//     });
//   }
//   return;

// }

// /**
// * React_Use_Function: use edit occupation function
// */
// export function useEditOccupation() {
//   const [occupation, setOccupation] = useState("");

//   function onSubmit() {
//     editOccupation({
//       occupation: occupation,

//     });
//   }
//   return;
// }

// /**
// * React_Use_Function: use edit status function
// */
// export function useEditStatus() {
//   const [status, setStatus] = useState("");

//   function onSubmit() {
//     editStatus({
//       status: status,

//     });
//   }
//   return;
// }

// /**
// * React_Use_Function: use add phone function
// */
// export function useAddPhone() {
//   const [phone, setPhone] = useState("");

//   function onSubmit() {
//     addPhone({
//       phone: phone,
//     });
//   }
//   return;
// }

// /**
// * React_Use_Function: use del phone function
// */
// export function useDelPhone() {
//   const [phone, setPhone] = useState("");

//   function onSubmit() {
//     delPhone({
//       phone: phone,
//     });
//   }
//   return;
// }

// /**
// * React_Use_Function: use add email function
// */
// export function useAddEmail() {
//   const [email, setPhone] = useState("");

//   function onSubmit() {
//     addEmail({
//       email: email,
//     });
//   }
//   return;
// }

// /**
// * React_Use_Function: use del email function
// */
// export function useDelEmail() {
//   const [email, setPhone] = useState("");

//   function onSubmit() {
//     delEmail({
//       email: email,
//     });
//   }
//   return;
// }
