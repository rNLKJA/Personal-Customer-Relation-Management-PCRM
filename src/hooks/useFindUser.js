import { useState, useEffect } from "react";
// import axios from 'axios';
import fetchClient from "../API/axiosClient/axiosClient";
export default function useFindUser() {
  const [user, setUser] = useState(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function findUser() {
      await fetchClient
        .get("/user/jwtTest")
        .then((res) => {
          if (isMounted) {
            setUser(res.data);
            setLoading(false);
          }
        })
        .catch((err) => {
          setLoading(false);
        });
    }
    findUser();
    return () => {
      isMounted = false;
    };
  }, []);
  return {
    user,
    isLoading,
  };
}
