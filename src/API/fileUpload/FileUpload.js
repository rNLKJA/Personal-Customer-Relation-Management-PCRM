import React, { useState, useEffect } from "react";

// import axios from 'axios';
import fetchClient from "../axiosClient/axiosClient";

import Button from "@mui/material/Button";
// import Link from '@mui/material/Link'
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Navbar from "../nav/Navbar";
import Heading from "../heading/heading.jsx";
import CircularProgress from "@mui/material/CircularProgress";
import { green } from "@mui/material/colors";
import Fab from "@mui/material/Fab";
import CheckIcon from "@mui/icons-material/Check";
import SaveIcon from "@mui/icons-material/Save";
import Alert from "@mui/material/Alert";
import Input from "@mui/material/Input";

const FileUpload = () => {
  const [file, setFile] = useState("");
  const [message, setMessage] = useState("");
  const [uploadPercentage, setUploadPercentage] = useState(0);
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const buttonSx = {
    ...(success && {
      bgcolor: green[500],
      "&:hover": {
        bgcolor: green[700],
      },
    }),
  };

  const onChange = (e) => {
    setFile(e.target.files[0]);
  };

  const [avatar, setAvatar] = useState("");

  useEffect(() => {
    const fetchAvatar = async () => {
      const response = await fetchClient.post("/profile/displayImage");
      setAvatar(response.data.image);
    };
    fetchAvatar();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("portrait", file);
    // console.log(formData);

    try {
      setSuccess(false);
      setLoading(true);
      const res = await fetchClient.post("/profile/uploadUserImage", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          setUploadPercentage(
            parseInt(
              Math.round((progressEvent.loaded * 100) / progressEvent.total),
            ),
          );
        },
      });

      if (res.data.status === "false") {
        alert("upload failed");
        return;
      }

      setTimeout(() => setUploadPercentage(0), 100);

      setSuccess(true);
      setLoading(false);

      setAvatar(res.data.portrait);
    } catch (err) {
      if (err) {
        setMessage("upload failed err: ", err);
      } else {
        setMessage(err.response.data.msg);
      }
      setUploadPercentage(0);
    }
  };

  return (
    <React.Fragment>
      <Heading />
      <Navbar />
      <div className="sub-container">
        {message ? <Alert severity="error">{message}</Alert> : null}
        <div
          className="upload-header"
          style={{
            alignItems: "center",
            justifyContent: "center",
            display: "flex",
          }}
        >
          {avatar ? (
            <Avatar
              sx={{ width: 100, height: 100, border: "2px solid pink" }}
              src={"data:image/png;base64," + avatar}
              alt=""
            />
          ) : (
            <Avatar />
          )}
        </div>
        <div
          className="upload-container "
          style={{
            alignItems: "center",
            justifyContent: "center",
            display: "flex",
          }}
        >
          <form onSubmit={onSubmit}>
            <label htmlFor="contained-button-file">
              <Input
                accept="image/*"
                id="contained-button-file"
                multiple
                type="file"
                onChange={onChange}
                hidden={true}
              />
              <Button variant="contained" component="span">
                Upload
              </Button>
            </label>

            <Box
              sx={{
                m: 1,
                position: "relative",
                alignItems: "center",
                justifyContent: "center",
                display: "flex",
              }}
            >
              <Fab
                aria-label="save"
                color="primary"
                sx={buttonSx}
                onClick={onSubmit}
              >
                {success ? <CheckIcon /> : <SaveIcon />}
              </Fab>
              {loading && (
                <CircularProgress
                  value={uploadPercentage}
                  variant="determinate"
                  size={68}
                  sx={{
                    color: green[500],
                    position: "absolute",
                  }}
                />
              )}
            </Box>
          </form>
        </div>

        <Button>
          <a href="/setting">BACK</a>
        </Button>
      </div>
    </React.Fragment>
  );
};

export default FileUpload;
