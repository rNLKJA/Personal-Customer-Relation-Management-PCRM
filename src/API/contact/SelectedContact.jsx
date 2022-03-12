import React, { useState, useEffect } from "react";
import "./editContact.css";
import fetchClient from "../axiosClient/axiosClient";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";
import { green } from "@mui/material/colors";
import Fab from "@mui/material/Fab";
import CheckIcon from "@mui/icons-material/Check";
import SaveIcon from "@mui/icons-material/Save";
// import Alert from "@mui/material/Alert";
import Input from "@mui/material/Input";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import UploadIcon from "@mui/icons-material/Upload";
import cx from "clsx";
import { makeStyles } from "@material-ui/core/styles";
import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialIcon from "@mui/material/SpeedDialIcon";
import SpeedDialAction from "@mui/material/SpeedDialAction";
import FileCopyIcon from "@mui/icons-material/FileCopyOutlined";
import PrintIcon from "@mui/icons-material/Print";
import ShareIcon from "@mui/icons-material/Share";
import DeleteIcon from "@mui/icons-material/Delete";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
// import { StyledEngineProvider } from "@mui/material/styles";
// import { red } from "@mui/material/colors";
import { useHistory } from "react-router-dom";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";

// const colorSave = green[500];

// const colorDelete = red[500];

// const BASE_URL = "http://localhost:5000";
// const BASE_URL = "https://crm4399.herokuapp.com";

const SelectedContact = ({ setOneContact, oneContact, deleteHandler }) => {
  // set selectedContact state with an additional property named edit
  // if edit === true, allow user edit form
  const [selectedContact, setSelectedContact] = useState({
    ...oneContact,
    edit: false,
  });

  return (
    <React.Fragment>
      {window.innerWidth <= 1023 ? (
        <button
          className="back"
          onClick={() => {
            setOneContact({ ...oneContact, selected: false });
          }}
        >
          Back
        </button>
      ) : null}

      <DisplayContact
        key={selectedContact._id}
        selectedContact={selectedContact}
        setSelectedContact={setSelectedContact}
        deleteHandler={deleteHandler}
        setOneContact={setOneContact}
        originContact={oneContact}
      />
    </React.Fragment>
  );
};

export default SelectedContact;

export function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
  };
}

export const DisplayContact = ({
  selectedContact,
  setSelectedContact,
  deleteHandler,
  setOneContact,
  originContact,
}) => {
  // defined variables
  const history = useHistory();

  // window size
  const [windowDimensions, setWindowDimensions] = useState(
    getWindowDimensions(),
  );
  const [contact, setContact] = useState(selectedContact);

  const [phones, setPhones] = useState(
    ConvertListStringToListObject(contact.phone, "phone"),
  );
  const [emails, setEmails] = useState(
    ConvertListStringToListObject(contact.email, "email"),
  );

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
  const [customField, setCustomField] = useState([]);
  const [valid, setValid] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (contact.portrait === null) {
      setAvatar("");
    } else if (contact.portrait !== undefined) {
      setAvatar(contact.portrait.data.toString("base64"));
      // console.log(contact.portrait.data.toString("base64"))
    }

    if (contact.customField !== undefined) {
      setCustomField(contact.customField);
    }
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [contact.portrait, contact.customField]);

  const styles_btn = {
    "&.MuiButton-contained": {
      color: "success",
    },
    "&.MuiButton-outlined": {
      color: "error",
    },
  };

  const handleAddField = (e) => {
    e.preventDefault();
    setCustomField([...customField, { field: "", value: "" }]);
  };

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

    if (type === "field") {
      setCustomField((prev) => prev.filter((item) => item !== prev[index]));
    }
  };

  // submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    var email = ConvertListObjectToListValues(emails, "email");
    var phone = ConvertListObjectToListValues(phones, "phone");

    const data = {
      ...contact,
      phone,
      email,
      customField,
    };

    setSelectedContact(data);

    setValid(true);

    setLoading(true);

    console.log(valid);

    dataValidator(phone, "phone", setValid, valid, setError);
    dataValidator(email, "email", setValid, valid, setError);
    dataValidator(data.firstName, "firstName", setValid, valid, setError);
    dataValidator(data.lastName, "lastName", setValid, valid, setError);
    dataValidator(data.occupation, "occupation", setValid, valid, setError);
    dataValidator(data.customField, "field", setValid, valid, setError);

    const formData = new FormData();
    formData.append("_id", data._id);
    formData.append("firstName", data.firstName);
    formData.append("lastName", data.lastName);
    formData.append("email", data.email);
    formData.append("phone", data.phone);
    formData.append("occupation", data.occupation);
    formData.append("portrait", file1);
    formData.append("notes", data.notes);
    formData.append("customField", data.customField);

    for (var pair of formData.entries()) {
      console.log(pair[0] + ", " + pair[1]);
    }

    if (valid === false) {
      setTimeout(() => {
        setError("");
      }, 3000);
      setLoading(false);
    } else {
      try {
        setError("");
        setLoading(true);
        setSuccess(false);
        await fetchClient
          .post("/contact/updateContactInfo", formData, {
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
            console.log(response);
            if (response.data.status) {
              setSuccess(true);
            } else {
              setError("Opps, something wrong, please try later.");
            }
          });
      } catch (err) {
        console.log(err);
      }
      setLoading(false);

      setTimeout(() => {
        window.location.href = "/contact";
      }, 1000);
    }
  };

  const fieldOnChange = (index, event) => {
    event.preventDefault();
    event.persist();

    setCustomField((prev) => {
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

  const buttonSx = {
    ...(success && {
      bgcolor: green[500],
      "&:hover": {
        bgcolor: green[700],
      },
    }),
  };

  const onClickUpload = () => {
    setUpload(!upload);
    setFile("");
    setFileName("");
  };

  const onChange = (e) => {
    e.preventDefault();
    setFile1(e.target.files[0]);
    setFile(URL.createObjectURL(e.target.files[0]));
    setFileName(e.target.files[0].name);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("portrait", file1);
    formData.append("_id", contact._id);

    try {
      setSuccess(false);
      setLoading1(true);
      const res = await fetchClient
        .post("/contact/uploadContactImage", formData, {
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
        })
        .then((response) => {
          setAvatar(response.data.portrait.data.toString("base64"));
          setLoading1(false);
        })
        .catch((error) => {
          setLoading1(false);
          alert(error);
        });

      if (res.data.status === "false") {
        setMessage("upload failed ");
        console.log(message);
        return;
      }

      // setTimeout(() => setUploadPercentage(0), 100);

      setSuccess(true);
      setLoading1(false);
      setUpload(false);
      // update hook state to rerender the new avatar
      // setAvatar(res.data.portrait)
    } catch (err) {
      if (err) {
        setMessage("upload failed err: ");
      } else {
        setMessage(err.response.data.msg);
      }
      setUploadPercentage(0);
    }
  };

  const sendInviteEmail = async (contact) => {
    const data = {
      lastName: contact.lastName,
      firstName: contact.firstName,
      email: contact.email,
      phone: contact.phone,
      occupation: contact.occupation,
    };

    await fetchClient.post("/user/fastRegisterPrepare", data).then((res) => {
      console.log(res);
      if (res.data.status) {
        alert(res.data.msg);
      } else {
        alert("Unable to invite this user, need set email for contact.");
      }
    });
  };

  return (
    <React.Fragment>
      {contact.edit ? null : (
        <button
          className="edit-btn"
          onClick={() => setContact({ ...contact, edit: !contact.edit })}
        >
          Edit
        </button>
      )}

      {contact.edit ? (
        <button
          className="back-btn"
          onClick={() => {
            setContact({ ...originContact, selected: true, edit: false });
            setPhones(ConvertListStringToListObject(contact.phone, "phone"));
            setEmails(ConvertListStringToListObject(contact.email, "email"));
          }}
        >
          Cancel
        </button>
      ) : null}

      <div className="makeStyles-card-1" style={{ width: "95%" }}>
        <div className="avatar">
          {!file ? (
            <Avatar
              alt="Avatar"
              sx={{ width: 125, height: 125, border: "2px solid pink" }}
              margin={3}
              src={avatar ? "data:image/png;base64," + avatar : ""}
            />
          ) : (
            <Avatar
              alt="Avatar"
              sx={{ width: 125, height: 125, border: "2px solid pink" }}
              margin={3}
              src={file}
            />
          )}

          {contact.linkedAccount === null && window.innerWidth <= 1023 && (
            <button
              className="btn btn-primary"
              style={{
                position: "fixed",
                width: "100px",
                top: "1.5rem",
                right: "2rem",
              }}
              onClick={() => {
                sendInviteEmail(contact);
              }}
            >
              Invite
            </button>
          )}
          {contact.linkedAccount === null && window.innerWidth >= 1023 && (
            <button
              className="btn btn-primary"
              style={{
                position: "fixed",
                width: "50px",
                top: "13rem",
                right: "1rem",
              }}
              onClick={() => {
                sendInviteEmail(contact);
              }}
            >
              Invite
            </button>
          )}

          {contact.edit ? (
            upload ? (
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

                  {/* {file1 ? (
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
                  ) : null} */}
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
            )
          ) : null}
        </div>

        <form className="edit-contact-form">
          <label>First Name: </label>
          <input
            type="text"
            value={contact.firstName}
            className="form-control"
            readOnly={!contact.edit}
            onChange={(e) =>
              setContact({ ...contact, firstName: e.target.value })
            }
          />

          <label>Last Name: </label>
          <input
            type="text"
            value={contact.lastName}
            className="form-control"
            readOnly={!contact.edit}
            onChange={(e) =>
              setContact({ ...contact, lastName: e.target.value })
            }
          />

          <label>Occupation: </label>
          <input
            type="text"
            value={contact.occupation}
            className="form-control"
            readOnly={!contact.edit}
            required
            onChange={(e) =>
              setContact({ ...contact, occupation: e.target.value })
            }
          />

          {phones.length !== 0 ? <label>Phone:</label> : null}

          {phones.map((phone, i) => {
            return (
              <div className="multi-field" key={"phone" + i}>
                <div
                  className="multi-field-input"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: "10px",
                    width: "100%",
                  }}
                >
                  <input
                    type="text"
                    pattern="\d*"
                    value={phone.phone}
                    className="form-control"
                    name="phone"
                    required
                    minLength={10}
                    maxLength={10}
                    onChange={(e) => phoneOnChange(i, e)}
                  />

                  {contact.edit && (
                    <Button
                      variant="outlined"
                      onClick={(e) => removeHandler(e, i, "phone")}
                    >
                      <DeleteIcon />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {contact.edit && (
            <>
              <Button
                variant="contained"
                sx={{ width: "50%" }}
                onClick={handleAddPhone}
              >
                add phone
              </Button>
              <br />
            </>
          )}

          {emails.length !== 0 ? <label>Email Address</label> : null}
          {emails.map((mail, i) => {
            return (
              <div className="multi-field" key={"email" + i}>
                <div
                  className="multi-field-input"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: "10px",
                    width: "100%",
                  }}
                >
                  <input
                    value={mail.email}
                    type="email"
                    name="email"
                    className="form-control"
                    required
                    onChange={(e) => emailOnChange(i, e)}
                  ></input>

                  {contact.edit && (
                    <Button
                      variant="outlined"
                      onClick={(e) => removeHandler(e, i, "email")}
                    >
                      <DeleteIcon />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {contact.edit && (
            <Button
              variant="contained"
              sx={{ width: "50%" }}
              onClick={handleAddEmail}
            >
              Add Email
            </Button>
          )}

          <br />

          <label>Notes:</label>
          <br />

          <TextField
            id="outlined-read-only-input"
            multiline
            maxRows={4}
            InputProps={{
              readOnly: !contact.edit,
            }}
            value={contact.note ? contact.note : ""}
            onChange={(e) => {
              setContact({ ...contact, note: e.target.value });
            }}
          />

          <hr />

          <label>Custom Field</label>
          {customField.map((field, i) => {
            return (
              <div>
                <div
                  key={`${field}-${i} ${new Date().toISOString()}`}
                  className="multi-field"
                >
                  <div className="multi-field-input">
                    <input
                      key={new Date().toISOString()}
                      value={field.field}
                      name="field"
                      type="text"
                      className="form-control"
                      readOnly={!contact.edit}
                      onChange={(e) => fieldOnChange(i, e)}
                      placeholder="Field Name"
                    />

                    <input
                      value={field.value}
                      type="text"
                      name="value"
                      className="form-control"
                      readOnly={!contact.edit}
                      onChange={(e) => fieldOnChange(i, e)}
                      placeholder="Field Value"
                    />
                  </div>
                  {contact.edit && (
                    <Button
                      variant="outlined"
                      onClick={(e) => removeHandler(e, i, "field")}
                    >
                      <DeleteIcon />
                    </Button>
                  )}
                </div>
                <hr />
              </div>
            );
          })}

          <br />

          {contact.edit && (
            <Button
              variant="contained"
              sx={{ width: "50%" }}
              onClick={handleAddField}
            >
              Add Field
            </Button>
          )}

          <hr />

          {error ? <Alert severity="error">{error}</Alert> : null}
          {!loading && success ? (
            <Alert severity="success">
              {"Successfully save, the page will redirect in 3s"}
            </Alert>
          ) : null}
          {loading && !success ? (
            <Box sx={{ width: "100%", padding: "10px" }}>
              <br />
              <LinearProgress variant="determinate" value={progress} />
              <br />
            </Box>
          ) : null}

          {contact.edit && (
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                sx={styles_btn}
                onClick={(e) => handleSubmit(e)}
              >
                Save Change
              </Button>

              <Button
                variant="outlined"
                sx={styles_btn}
                onClick={(e) => {
                  if (
                    window.confirm(
                      "Are you sure you wanna delete this contact?",
                    )
                  ) {
                    deleteHandler(e);
                  }
                }}
              >
                Delete The Contact
              </Button>
            </Stack>
          )}
        </form>
      </div>
    </React.Fragment>
  );
};

const ConvertListStringToListObject = (items, type) => {
  var result = [];
  if (items !== undefined && items.length > 0) {
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

    if (type === "field") {
      for (let i = 0; i < items.length; i++) {
        result.push({ field: items[i] });
      }
    }
  }
  return result;
};

const ConvertListObjectToListValues = (items, type) => {
  var result = [];
  if (items !== undefined && items.length > 0) {
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

    if (type === "field") {
      for (let i = 0; i < items.length; i++) {
        result.push(items[i].field);
      }
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
    case "field":
      for (let i = 0; i < items.length; i++) {
        if (items[i].field === "") {
          setValid(false);
          setError("Field name cannot be empty");
        } else if (items[i].value === "") {
          setValid(false);
          setError("Field value cannot be empty");
        }
      }
      break;
    default:
      setValid(false);
      console.log("Invalid Input");
  }
};
