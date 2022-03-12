import React from "react";
import { useState, useEffect } from "react";
// import { Link } from "react-router-dom";
// import axios from "axios";
// import LogoutUser from "../../hooks/useLogout";
import "./person.css";
import { useShowProfile } from "../../BackEndAPI/profileAPI";
import fetchClient from "../axiosClient/axiosClient";
// import e.target.files[0]_code from "../nav/qr-code.png";
import Heading from "../heading/heading";
import Navbar from "../nav/Navbar";
import UpdatePassword from "./UpdatePassword";
import Avatar from "@mui/material/Avatar";
import UploadIcon from "@mui/icons-material/Upload";
import Button from "@mui/material/Button";
import { makeStyles } from "@material-ui/core/styles";
import CircularProgress from "@mui/material/CircularProgress";
import { green } from "@mui/material/colors";
// import Fab from "@mui/material/Fab";
// import CheckIcon from "@mui/icons-material/Check";
// import SaveIcon from "@mui/icons-material/Save";
import Alert from "@mui/material/Alert";
import Input from "@mui/material/Input";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import Person1 from "./Person1.js";

import cx from "clsx";

const useFabStyle = makeStyles((success) => ({
  name: {
    color: "blue",
  },
  fab: {
    ...(success && {
      bgcolor: "#4caf50",
      "&:hover": {
        bgcolor: "#388e3c",
      },
    }),
    borderRadius: 5,
  },
}));

const Person = () => {
  useEffect(() => {
    document.title = "Personal Information";
  }, []);

  const { loading, profile, error } = useShowProfile();

  //hooks for avatar upload
  const [upload, setUpload] = useState(false);

  const [avatar, setAvatar] = useState("");
  const [file, setFile] = useState("");
  const [file1, setFile1] = useState("");
  const [message, setMessage] = useState("");
  const [uploadPercentage, setUploadPercentage] = useState(0);
  const [loading1, setLoading1] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fileName, setFileName] = useState("");

  // console.log(success, loading1);

  const styles = useFabStyle(success);

  // fetch avatar when render
  useEffect(() => {
    const fetchAvatar = async () => {
      const response = await fetchClient.get("/profile/displayImage");
      setAvatar(response.data.image);
    };
    fetchAvatar();
  }, []);

  if (error) {
    return (
      <React.Fragment>
        <Heading />
        <Navbar />
        <div className="sub-container">
          <div className="sub-container">Error</div>;
        </div>
      </React.Fragment>
    );
  }

  if (loading) {
    return (
      <React.Fragment>
        <Heading />
        <Navbar />
        <div className="sub-container">
          <div className="loading">
            <h1>Loading Your Information</h1>
            <h1>(っ˘ω˘ς )</h1>
          </div>
        </div>
      </React.Fragment>
    );
  }

  const onClickUpload = () => {
    setUpload(!upload);
  };

  if (error) {
    return <div className="sub-container"></div>;
  }

  if (loading) {
    return (
      <div className="sub-container">
        <div className="loading">
          <h1>Loading Your Detail</h1>
          <h1>(っ˘ω˘ς )</h1>
        </div>
      </div>
    );
  }

  // following functions are used for uploadUserImage

  const buttonSx = {
    ...(success && {
      bgcolor: green[500],
      "&:hover": {
        bgcolor: green[700],
      },
    }),
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("portrait", file1);

    try {
      setSuccess(false);
      setLoading1(true);
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
        setMessage("upload failed ");
        return;
      }

      setTimeout(() => setUploadPercentage(0), 100);

      setSuccess(true);
      setLoading1(false);
      // TODO: backend should return the decoded string of image in res.data.portrait.
      // update hook state to rerender the new avatar
      setAvatar(res.data.image);
    } catch (err) {
      if (err) {
        setMessage("upload failed err: ");
      } else {
        setMessage(err.response.data.msg);
      }
      setUploadPercentage(0);
    }
    setUpload(false);
  };

  const onChange = (e) => {
    e.preventDefault();
    setFile1(e.target.files[0]);
    setFile(URL.createObjectURL(e.target.files[0]));
    setFileName(e.target.files[0].name);
  };

  return (
    <React.Fragment>
      <Heading />
      <Navbar />
      <div className="sub-container">
        {/* <div className="person-heading">
          <h1>Personal Information</h1>


        </div> */}

        <div className="person-container">
          {message ? <Alert severity="error">{message}</Alert> : null}
          <div className="avatar">
            <Avatar
              alt="Avatar"
              sx={{
                width: 150,
                height: 150,
                border: "2px solid pink",
                marginTop: "15px",
              }}
              margin={3}
              src={avatar ? "data:image/png;base64," + avatar : file}
            />

            <span>
              {upload ? (
                <div className="upload-container ">
                  <form
                    onSubmit={onSubmit}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexDirection: "column",
                    }}
                  >
                    <label
                      htmlFor="contained-button-file"
                      style={{ padding: "10px" }}
                    >
                      <Input
                        accept="image/*"
                        id="contained-button-file"
                        multiple
                        type="file"
                        hidden={true}
                        onChange={onChange}
                      />
                      <Button variant="contained" component="span">
                        <Typography variant="body2">Choose</Typography>
                      </Button>
                    </label>
                    <div
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        width: "7rem",
                      }}
                    >
                      <Typography variant="body2" noWrap color="text.secondary">
                        {fileName}
                      </Typography>
                    </div>

                    {file ? (
                      <>
                        <Box
                          sx={{
                            m: 1,
                            position: "relative",
                            alignItems: "center",
                            justifyContent: "center",
                            display: "flex",
                          }}
                        >
                          <Button
                            variant="contained"
                            sx={buttonSx}
                            disabled={loading1}
                            onClick={onSubmit}
                          >
                            Upload
                          </Button>
                          {loading1 && (
                            <CircularProgress
                              value={uploadPercentage}
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
                      </>
                    ) : null}

                    <Button
                      variant="contained"
                      color="error"
                      onClick={onClickUpload}
                      sx={{ margin: 2 }}
                    >
                      Cancel
                    </Button>
                  </form>
                </div>
              ) : (
                [
                  <div className="upload-btn">
                    <Button onClick={onClickUpload}>
                      <UploadIcon />
                      Upload
                    </Button>
                  </div>,
                ]
              )}
            </span>
          </div>

          {/* the code below is used for upload avatar */}

          {profile && <Person1 key={profile._id} profile={profile} />}
        </div>
      </div>
    </React.Fragment>
  );
};

export default Person;

export const UpdatePasswordComponent = ({ email }) => {
  const [updatePassword, setUpdatePassword] = useState(false);
  const [updatePasswordBtn, setUpdatePasswordBtn] = useState(true);

  return (
    <React.Fragment>
      {updatePasswordBtn && (
        <button
          className="password-btn"
          onClick={() => {
            setUpdatePassword(!updatePassword);
            setUpdatePasswordBtn(!updatePasswordBtn);
          }}
        >
          Change Your Password
        </button>
      )}

      {updatePassword && (
        <React.Fragment>
          <UpdatePassword email={email} />
          <button
            className="password-btn"
            onClick={() => {
              setUpdatePassword(!updatePassword);
              setUpdatePasswordBtn(!updatePasswordBtn);
            }}
            style={{ border: "none", color: "red", marginBottom: "20px" }}
          >
            Abort Change
          </button>
        </React.Fragment>
      )}
    </React.Fragment>
  );
};
