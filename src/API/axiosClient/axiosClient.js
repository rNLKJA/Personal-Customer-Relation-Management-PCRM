import axios from "axios";

const fetchClient = () => {
  const defaultOptions = {
    baseURL: "https://crm4399.herokuapp.com",

    // baseURL: "http://localhost:5000",
    method: "get",

    headers: {
      "Content-Type": "application/json",
    },
  };

  // Create instance
  let instance = axios.create(defaultOptions);

  // Set the AUTH token for any request
  instance.interceptors.request.use(function (config) {
    // console.log('using axios instance')

    const token = localStorage.getItem("jwt");
    // console.log('axios get the token ' + token)
    config.headers.Authorization = token ? token : "";

    return config;
  });

  return instance;
};

export default fetchClient();
