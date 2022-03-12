import React, { useState } from "react";
import "./person.css";
import fetchClient from "../axiosClient/axiosClient";
import LogoutUser from "../../hooks/useLogout";
// import { useShowProfile } from "../../BackEndAPI/profileAPI";
// import Heading from "../heading/heading";
// import Navbar from "../nav/Navbar";
// import LogoutUser from "../../hooks/useLogout";

// import { Contacts } from "@mui/icons-material";
// import portrait from "./portrarit.png";
import Stack from "@mui/material/Stack";
// import Link from "@mui/material/Link";
import Button from "@mui/material/Button";
import QrCodeIcon from "@mui/icons-material/QrCode";
import LogoutIcon from "@mui/icons-material/Logout";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import Box from "@mui/material/Box";
// import ShareIcon from "@mui/icons-material/Share";

// const BASE_URL = "http://localhost:5000";
const BASE_URL = "https://crm4399.herokuapp.com";

const Person1 = (profile) => {
  // set selectedContact state with an additional property named edit
  // if edit === true, allow user edit form
  const [oneProfile, setOneProfile] = useState({
    ...profile.profile,
    edit: false,
  });

  return (
    <React.Fragment>
      <div className="profile-container">
        <DisplayPerson
          oneProfile={oneProfile}
          setOneProfile={oneProfile}
          setOneProile={setOneProfile}
          originProfile={profile.profile}
        />
      </div>
    </React.Fragment>
  );
};

export default Person1;

export const DisplayPerson = ({
  oneProfile,
  setOneProfile,
  deleteHandler,
  originProfile,
}) => {
  // defined variables
  const [person, setPerson] = useState(oneProfile);

  const [valid, setValid] = useState(true);

  const [phones, setPhones] = useState(
    ConvertListStringToListObject(person.phone, "phone"),
  );
  const [emails, setEmails] = useState(
    ConvertListStringToListObject(person.email, "email"),
  );

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  // add input field
  const handleAddPhone = (e) => {
    e.preventDefault();
    setPhones([...phones, { phone: "" }]);
  };

  const handleAddEmail = (e) => {
    e.preventDefault();
    setEmails([...emails, { email: "" }]);
  };

  // used to move a particular input field
  const removeHandler = (e, index, type) => {
    e.preventDefault();
    if (type === "phone") {
      setPhones((prev) => prev.filter((item) => item !== prev[index]));
    }

    if (type === "email") {
      setEmails((prev) => prev.filter((item) => item !== prev[index]));
    }
  };

  // submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    var email = ConvertListObjectToListValues(emails, "email");
    var phone = ConvertListObjectToListValues(phones, "phone");

    email = email.filter((e) => e !== "");
    phone = phone.filter((e) => e !== "");

    const data = {
      ...person,
      phone,
      email,
    };
    setValid(true);

    setLoading(true);

    dataValidator(phone, "phone", setValid, valid, setError);
    dataValidator(email, "email", setValid, valid, setError);
    dataValidator(data.firstName, "firstName", setValid, valid, setError);
    dataValidator(data.lastName, "lastName", setValid, valid, setError);
    dataValidator(data.occupation, "occupation", setValid, valid, setError);
    dataValidator(data.customField, "field", setValid, valid, setError);

    // console.log(valid);

    if (!valid) {
      setTimeout(() => {
        setError("");
      }, 3000);
      setLoading(false);
    } else {
      try {
        await fetchClient
          .post(BASE_URL + "/profile/editProfile", data, {
            onUploadProgress: (progressEvent) => {
              setProgress(
                parseInt(
                  Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total,
                  ),
                ),
              );
            },
          })
          .then((response) => {
            // console.log(response)
            if (response.data === "update success") {
              setSuccess(true);
              setPerson({ ...data, edit: false });

              // window.location.href = "/contact";
            } else {
              setError("Opps, something wrong, please try later.");
            }
          });
      } catch (err) {
        console.log(err);
      }

      setLoading(false);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);

      /*window.location.href = "/setting";*/
      // setContact({ ...contact, edit: false });

      // setOneContact({ ...contact, edit: false, selected: false });
    }
  };

  // input field change handler
  const phoneOnChange = (index, event) => {
    event.preventDefault();
    event.persist();

    setPhones((prev) => {
      return prev.map((item, i) => {
        if (i !== index) {
          return item;
        }

        return {
          ...item,
          [event.target.name]: event.target.value,
        };
      });
    });
  };

  const emailOnChange = (index, event) => {
    event.preventDefault();
    event.persist();

    setEmails((prev) => {
      return prev.map((item, i) => {
        if (i !== index) {
          return item;
        }

        return {
          ...item,
          [event.target.name]: event.target.value,
        };
      });
    });
  };

  return (
    <React.Fragment>
      <Stack direction="row" spacing={1}>
        {/* <Link to="/setting/qr">
                <button className="qr-code">QR Code</button>
                </Link>

                <button className="logout-btn" onClick={LogoutUser}>
                    Log out
                </button> */}

        {!person.edit ? (
          <Button
            variant="contained"
            onClick={() => setPerson({ ...person, edit: !person.edit })}
            id="edit-button"
          >
            <EditIcon />
          </Button>
        ) : null}
        {!person.edit ? (
          <Button variant="contained" color="success" href="/setting/qr">
            <QrCodeIcon />
          </Button>
        ) : null}
        {person.edit ? (
          <Button
            variant="contained"
            sx={{ backgroundColor: "#01579b" }}
            href="/resetPassword"
          >
            change password
          </Button>
        ) : null}
        {/* {!person.edit ? (
          <Button
            variant="contained"
            sx={{ backgroundColor: "#01579b" }}
            href="/setting/share"
          >
            <ShareIcon />
          </Button>
        ) : null} */}
        {!person.edit ? (
          <Button variant="contained" color="error" onClick={LogoutUser}>
            <LogoutIcon />
          </Button>
        ) : null}

        {person.edit ? (
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setPerson({ ...originProfile, selected: true, edit: false });
              setPhones(ConvertListStringToListObject(person.phone, "phone"));
              setEmails(ConvertListStringToListObject(person.email, "email"));
            }}
          >
            cancel
          </Button>
        ) : null}
      </Stack>

      <div className="person-details">
        <div className="makeStyles-card-2">
          <form
            className="edit-contact-form"
            style={{
              display: "flex",
              flexDirection: "column",
              height: "90%",
            }}
          >
            <label>Username: </label>
            <input
              type="text"
              className="form-control"
              readOnly
              value={person.userName}
            ></input>

            <hr />

            <label>First Name: </label>
            <input
              type="text"
              value={person.firstName}
              className="form-control"
              readOnly={!person.edit}
              onChange={(e) =>
                setPerson({ ...person, firstName: e.target.value })
              }
              required={true}
            ></input>

            <hr />

            <label>Last Name: </label>
            <input
              type="text"
              value={person.lastName}
              className="form-control"
              readOnly={!person.edit}
              onChange={(e) =>
                setPerson({ ...person, lastName: e.target.value })
              }
              required={true}
            ></input>

            <hr />

            <label>Occupation: </label>
            <input
              type="text"
              value={person.occupation}
              className="form-control"
              readOnly={!person.edit}
              onChange={(e) =>
                setPerson({ ...person, occupation: e.target.value })
              }
              required={true}
            ></input>

            <hr />

            <label>Phone:</label>
            {phones.map((phone, i) => {
              return (
                <>
                  <div key={`${phone}-${i}`} className="multi-field">
                    <div className="multi-field-input">
                      <input
                        text="text"
                        pattern="\d*"
                        value={phone.phone}
                        className="form-control"
                        name="phone"
                        readOnly={!person.edit}
                        required={true}
                        minLength={10}
                        maxLength={10}
                        onChange={(e) => phoneOnChange(i, e)}
                      />
                    </div>
                    {person.edit ? (
                      <Button
                        variant="outlined"
                        onClick={(e) => removeHandler(e, i, "phone")}
                        id="phone-delete-btn"
                      >
                        <DeleteIcon />
                      </Button>
                    ) : null}
                  </div>

                  <hr />
                </>
              );
            })}

            {person.edit && (
              <div className="div-center">
                <Button
                  variant="contained"
                  sx={{ width: "50%" }}
                  onClick={handleAddPhone}
                >
                  add phone
                </Button>
                <br />
              </div>
            )}

            <label>Email:</label>
            {emails.map((mail, i) => {
              return (
                <>
                  <div key={`${mail}-${i}`} className="multi-field">
                    <div className="multi-field-input">
                      <input
                        value={mail.email}
                        type="email"
                        name="email"
                        className="form-control"
                        readOnly={!person.edit}
                        required={true}
                        onChange={(e) => emailOnChange(i, e)}
                      />
                    </div>
                    {person.edit && (
                      <Button
                        variant="outlined"
                        onClick={(e) => removeHandler(e, i, "email")}
                        id="email-delete-btn"
                      >
                        <DeleteIcon />
                      </Button>
                    )}
                  </div>

                  <hr />
                </>
              );
            })}

            {person.edit && (
              <div className="div-center">
                <Button
                  variant="contained"
                  sx={{ width: "50%" }}
                  onClick={handleAddEmail}
                >
                  Add Email
                </Button>
              </div>
            )}

            <hr />

            {error ? <Alert severity="error">{error}</Alert> : null}
            {!loading && success ? (
              <Alert severity="success">{"Successfully save"}</Alert>
            ) : null}
            {loading && !success ? (
              <Box sx={{ width: "100%", padding: "10px" }}>
                <br />
                <LinearProgress variant="determinate" value={progress} />
                <br />
              </Box>
            ) : null}

            {person.edit && (
              <Button
                variant="contained"
                color="success"
                onClick={(e) => handleSubmit(e)}
              >
                Save Change
              </Button>
            )}
          </form>
        </div>
      </div>
    </React.Fragment>
  );
};

const ConvertListStringToListObject = (items, type) => {
  // console.log(items)
  var result = [];
  if (type === "phone") {
    for (let i = 0; i < items.length; i++) {
      result.push({ phone: items[i] });
    }
  }

  if (type === "email") {
    for (let i = 0; i < items.length; i++) {
      result.push({ email: items[i] });
    }
  }
  return result;
};

const ConvertListObjectToListValues = (items, type) => {
  var result = [];
  if (type === "phone") {
    for (let i = 0; i < items.length; i++) {
      result.push(items[i].phone);
    }
  }

  if (type === "email") {
    for (let i = 0; i < items.length; i++) {
      result.push(items[i].email);
    }
  }

  return result;
};

const dataValidator = (items, type, setValid, valid, setError) => {
  var pattern, notEmpty;
  switch (type) {
    case "firstName":
      if (items.length === 0) {
        setValid(false);
        setError(`Invalid ${type} input, input cannot be empty`);
      }
      break;
    case "lastName":
      if (items.length === 0) {
        setValid(false);
        setError(`Invalid ${type} input, input cannot be empty`);
      }
      break;
    case "occupation":
      if (items.length === 0) {
        setValid(false);
        setError(`Invalid ${type} input, input cannot be empty`);
      }
      break;
    case "phone":
      pattern = /\d{10}/;
      notEmpty = /\S/;
      console.log(valid);
      if (items.length < 1) {
        setValid(false);
        setError("You must provide at least one phone number!");
      }

      console.log(valid);

      for (let i = 0; i < items.length; i++) {
        if (!pattern.test(items[i]) && !notEmpty.test(items[i])) {
          setValid(false);
          setError("Invalid phone format");
        }
      }
      break;
    case "email":
      pattern = /^([A-Za-z0-9_\-.])+@([A-Za-z0-9_\-.])+\.([A-Za-z]{2,4})$/;
      notEmpty = /\S/;
      if (items.length < 1) {
        setValid(false);
        setError("You must have at least one email!");
      }

      for (let i = 0; i < items.length; i++) {
        if (!pattern.test(items[i]) && !notEmpty.test(items[i])) {
          setValid(false);
          setError("Invalid email format");
        }
      }

      break;

    default:
  }
};
