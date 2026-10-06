import { useState, useEffect } from "react";
import fetchClient from "../API/axiosClient/axiosClient";
import axios from "axios";
// const BASE_URL = "http://localhost:5000";

axios.defaults.withCredentials = true;

/**
 * Back-End API: create a Record for the client
 * @param {json} recordInfo - the information of record being created
 * @return {express.Response} res - response from the back-end server.
 */
// function createRecord(recordInfo) {
//   const endpoint =  "/record/createRecord";
//   return fetchClient.post(endpoint, recordInfo).then((res) => res.data);
// }

/**
 * Back-End API: Show all the Record for the client
 * @return {express.Response} res - response from the back-end server.
 */
async function showAllRecords() {
  const endpoint = "/record/showRecord";
  return await fetchClient.get(endpoint).then((res) => res.data);
}

// function deleteOneRecord(recordId) {
//   const endpoint = "/record/deleteOneRecord";
//   return fetchClient.post(endpoint, recordId).then((res) => res.data);
// }
/**
 * React_Use_Function: Show all the Record for the client
 * @return {json} json file contains the record information
 */
export function useShowAllRecords() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    showAllRecords()
      .then((records) => {
        setRecords(records);
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
    records,
    error,
  };
}
