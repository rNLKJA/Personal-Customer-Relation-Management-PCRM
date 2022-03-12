import { useState, useEffect } from "react";
import fetchClient from "../API/axiosClient/axiosClient";
import axios from "axios";
// const BASE_URL = "https://crm4399.herokuapp.com";
const BASE_URL = "https://crm4399.herokuapp.com";

axios.defaults.withCredentials = true;
/**
 * this function will post to back end and return all contact of a user
 * @returns {JSON} response from back end contain contact list
 */
function getContacts() {
  const endpoint = BASE_URL + "/contact/showContact";
  return fetchClient.get(endpoint).then((res) => res.data);
}

// function createContactByUserName() {
//   const endpoint = BASE_URL + "/contact/createContactByUserName";
//   return fetchClient.get(endpoint).then((res) => res.data);
// }

// json file of contact info
/**
 * this function will post to back end with contact information to create a contact document
 * @param {JSON} contactInfo a JSON object that contain information to create a contact
 * @returns {JSON} the JSON object that from the database after create
 */
// function createContact(contactInfo) {
//    const endpoint = BASE_URL + "/contact/createContact";
//    return fetchClient.post(endpoint, contactInfo).then((res) => res.data);
//  }

//object ID as input
/**
 * this fucntion will post to back end with an object id of contact and return the detail information of that contact
 * @param {String} contactObjectId the Object Id as string of a contact
 * @returns {JSON} the full detail of an contact
 */
function ShowOneContact(contactObjectId) {
  const endpoint = BASE_URL + "/contact/showOneContact";
  return fetchClient
    .post(endpoint, { contactObjectId: contactObjectId })
    .then((res) => res.data);
}

/**
 * React_Use_Function: use show contactlist of user
 */
export function useContacts() {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    getContacts()
      .then((contacts) => {
        setContacts(contacts);
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
    contacts,
    error,
  };
}

/**
 * React_Use_Function: use show one contact detail
 */
export function useShowOneContact() {
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState();
  const [error, setError] = useState(false);

  useEffect(() => {
    ShowOneContact()
      .then((contact) => {
        setContact(contact);
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
    contact,
    error,
  };
}
/**
 * React_Use_Function: use create contact
 */
// export function useCreateContact() {
//   const [email, setEmail] = useState([]);
//   const [phone, setPhone] = useState([]);
//   const [firstName, setFirstName] = useState("");
//   const [lastName, setLastName] = useState("");
//   const [occupation, setOccupation] = useState("");
//   const [portrait, setPortrait] = useState("");
//   const [note, setNote] = useState("");

//   function onSubmit() {
//     createContact({
//       email: email,
//       phone: phone,
//       firstName: firstName,
//       lastName: lastName,
//       occupation: occupation,
//       portrait: portrait,
//       note: note,
//     });
//     //redirect if needed
//   }
//   return; //html for form
// }
