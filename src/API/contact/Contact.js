import React from "react";
import { useState, useEffect } from "react";
import "./contact.css";
import { useContacts } from "../../BackEndAPI/contactAPI";
// import { requirePropFactory } from "@material-ui/core";
// import Loading from "./pending";
import add_user from "./add-user.png";
import fetchClient from "../axiosClient/axiosClient";
import SelectedContact from "./SelectedContact.jsx";
// import SelectedContactLarge from "./SelectedContact-large.jsx";
/*import People from "./People.jsx";*/

import Error from "../error/Error";
import Heading from "../heading/heading.jsx";
import Navbar from "../nav/Navbar";
import { Link } from "react-router-dom";
import TextField from "@mui/material/TextField";
import getWindowDimensions from "../../hooks/getWindowDimensions";
import Select from "react-select";
import { makeStyles } from "@material-ui/styles";
import { Grid } from "@material-ui/core";
import Divider from "@mui/material/Divider";
import Person from "./Person";
// const BASE_URL = "http://localhost:5000";

// const BASE_URL = "https://crm4399.herokuapp.com";

const Contact = () => {
  useEffect(() => {
    document.title = "Contact";
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [windowDimensions, setWindowDimensions] = useState(
    getWindowDimensions(),
  );
  const [contactList, setContactList] = useState([]);
  const { loading, contacts, error } = useContacts();
  const [oneContact, setOneContact] = useState({
    firstName: "",
    lastName: "",
    email: [],
    linkedAccount: null,
    occupation: "",
    phone: [],
    selected: false,
  });

/*  const [slice, setSlice] = useState(9); // define the number of records display in the contact list*/
  const [count, setCount] = useState(9);

  if (false) {
    console.log(contactList);
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOption, setSelectedOption] = useState({
    value: null,
    label: "Null",
  });
  const options = [
    { value: "firstName", label: "First Name" },
    { value: "lastName", label: "Last Name" },
    { value: "occupation", label: "Occupation" },
    { value: "notes", label: "Notes" },
    { value: "addDate", label: "Add Date" },
    { value: null, label: "Null" },
  ];

  // const searchContacts = () => {
  //   return contacts.filter((contact) =>
  //     (
  //       contact.contact.firstName +
  //       " " +
  //       contact.contact.lastName +
  //       " " +
  //       contact.contact.occupation
  //     )
  //       .toLowerCase()
  //       .includes(searchTerm.toLowerCase()),
  //   );
  // };

  // const screenWidth = window.innerWidth;

  const handleChange = (e) => {
    e.preventDefault();
    setSearchTerm(e.target.value);
  };
  const handleOptions = (selectedOption) => {
    setSelectedOption(selectedOption);
    sortContact(contacts, setContactList, selectedOption.value);
  };

  const deleteHandler = async (e) => {
    e.preventDefault();
    await fetchClient
      .get(
        "/contact/deleteOneContact/" +
          localStorage.getItem("userName") +
          "/" +
          oneContact._id,
      )
      .then((response) => {
        if (response.data.status === "success") {
          alert("You've delete a contact :D");
          window.location.href = "/contact";
        } else {
          alert("Opps, something wrong X_X fail to delete the contact");
        }
      });
  };

  if (error) {
    return (
      <React.Fragment>
        <Heading />
        <Navbar />
        <div className="sub-container">
          <Error msg={"There is something wrong with Contact X_X"} />
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
          <h1 data-testid="contact" hidden>
            Contact Page
          </h1>
          <div className="loading">
            <h1>Loading Your Contact</h1>
            <h1>(っ˘ω˘ς )</h1>
          </div>
        </div>
      </React.Fragment>
    );
  }

  const addCount = () => {
/*    if (slice <= contacts.length) {
      setCount(parseInt(count) + parseInt(slice));
    } else {
      setCount(contacts.length);
    }*/
    setCount(count+9);
  };

/*
  const subCount = () => {
    if (parseInt(count) - parseInt(slice) <= 0) {
      setCount(5);
    } else {
      setCount(parseInt(count) - parseInt(slice));
    }
  };
*/

  return (
    <React.Fragment>
      <Navbar />
      <Heading />
      <div className="sub-container">
        <h1 data-testid="contact" hidden>
          Contact Page
        </h1>
        <div className="contact">
          {/* display contact as a list */}
          <div className="contactList" style={{ width: "97%" }}>
            {!oneContact.selected && windowDimensions.width <= 1023 && (
              <>
                <Link className="add-contact-a" to="./addUser">
                  <div className="add-contact">
                    <img src={add_user} alt="add contact"></img>
                  </div>
                </Link>

                <div
                  className="contactList-items"
                  style={{ alignItems: "center" }}
                >
                  <TextField
                    id="standard-basic"
                    label="Search by name/occupation"
                    style={{ width: "100%" }}
                    value={searchTerm}
                    onChange={(e) => handleChange(e)}
                  />

                  <Select
                    onChange={handleOptions}
                    options={options}
                    style={{
                      marginTop: "5px",
                      // marginRight: "5px",
                      fontSize: "1.9rem",
                      zIndex: 10,
                    }}
                  />
                  <People
                    contacts={contacts}
                    search_key={searchTerm}
                    loading={loading}
                    error={error}
                    options={selectedOption.value}
                    setOneContact={setOneContact}
                    count={count}
                  />
                  {count<contacts.length ? (
                      <div className="change-slice">
                        <button
                            className="btn btn-primary add-slice"
                            onClick={addCount}
                        >
                          More
                        </button>
                      </div>
                  ):null}

                </div>
              </>
            )}

            {windowDimensions.width >= 1024 && (
              <>
                <Link className="add-contact-a" to="./addUser">
                  <div className="add-contact">
                    <img src={add_user} alt="add contact"></img>
                  </div>
                </Link>

                <div
                  className="contactList-items"
                  style={{ alignItems: "center"}}
                >
                  <TextField
                    id="standard-basic"
                    label="Search by name/occupation/date"
                    style={{ width: "90%"}}
                    value={searchTerm}
                    onChange={(e) => handleChange(e)}
                  />

                  <Select onChange={handleOptions} options={options} />

                  <People
                    contacts={contacts}
                    search_key={searchTerm}
                    loading={loading}
                    error={error}
                    options={selectedOption.value}
                    setOneContact={setOneContact}
                    count={count}
                  />
                  <div
                    className="change-slice"
                    style={{ position: "fixed", bottom: 0, right: 0 }}
                  >
                    {count<contacts.length ? (
                        <div className="change-slice">
                          <button
                              className="btn btn-primary add-slice"
                              onClick={() => {
                                addCount();
                                console.log(count);
                              }}
                          >
                            More
                          </button>
                        </div>
                    ):null}

                  </div>
                </div>
              </>
            )}
            {windowDimensions.width <= 1023 && oneContact.selected && (
              <div className="contactDetail">
                <SelectedContact
                  key={oneContact._id}
                  oneContact={oneContact}
                  setOneContact={setOneContact}
                  deleteHandler={deleteHandler}
                />
              </div>
            )}
          </div>
          {windowDimensions.width >= 1024 && oneContact.selected && (
            <>
              <SelectedContact
                key={oneContact._id}
                oneContact={oneContact}
                setOneContact={setOneContact}
                deleteHandler={deleteHandler}
                width={windowDimensions.width}
              />
            </>
          )}

          {windowDimensions.width >= 1023 && !oneContact.selected && (
            <div className="makeStyles-card-1" style={{ width: "95%" }}>
              <div>
                <h1>Select your contact to check detail</h1>
                <h1>(っ˘ω˘ς )</h1>
              </div>
            </div>
          )}
        </div>
      </div>
    </React.Fragment>
  );
};

export default Contact;
export const People = (prop) => {
  const styles = useStyles();
  const searchContacts = () => {
    if (prop.contacts !== undefined) {
      switch (prop.options) {
        case "firstName":
          return prop.contacts.filter((contact) =>
            contact.contact.firstName
              .toLowerCase()
              .includes(prop.search_key.toLowerCase()),
          );

        case "lastName":
          return prop.contacts.filter((contact) =>
            contact.contact.lastName
              .toLowerCase()
              .includes(prop.search_key.toLowerCase()),
          );

        case "occupation":
          return prop.contacts.filter((contact) =>
            contact.contact.occupation
              .toLowerCase()
              .includes(prop.search_key.toLowerCase()),
          );

        case "notes":
          return prop.contacts.filter((contact) =>
            contact.contact.note
              .toLowerCase()
              .includes(prop.search_key.toLowerCase()),
          );

        case "addDate":
          return prop.contacts.filter((contact) =>
            convert(contact.contact.addDate)
              .toLowerCase()
              .includes(prop.search_key.toLowerCase()),
          );

        case null:
          // console.log("NULL")
          return prop.contacts.filter((contact) =>
            (
              contact.contact.firstName +
              " " +
              contact.contact.lastName +
              " " +
              convert(contact.contact.addDate) +
              " " +
              contact.contact.note +
              " " +
              contact.contact.occupation
            )
              .toLowerCase()
              .includes(prop.search_key.toLowerCase()),
          );
        default:
          break;
      }
    }
  };

  let filteredContacts = searchContacts();

  return (
    <Grid
      container
      direction="row"
      justifyContent="flex-start"
      alignItems="center"
      margin={2}
      spacing={2}
      padding={"20px"}
    >
      {filteredContacts.slice(0, prop.count).map((contact) => {
        return (
          <Grid
            key={contact.contact._id + new Date().toISOString()}
            item
            xs={12}
            sm={6}
            md={12}
          >
            <Person
              key={new Date().toISOString() + "1"}
              contact={contact}
              setOneContact={prop.setOneContact}
            />
            <Divider
              key={new Date().toISOString() + "2"}
              variant={"middle"}
              className={styles.divider}
            />
          </Grid>
        );
      })}
    </Grid>
  );
};
// This function convert the dateTime to a a formal string
export function convert(str) {
  var date = new Date(str),
    month = ("0" + (date.getMonth() + 1)).slice(-2),
    day = ("0" + date.getDate()).slice(-2);

  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? "pm" : "am";

  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = ("0" + minutes).slice(-2);

  var strTime;
  if (hours > 9) {
    strTime = " " + hours + ":" + minutes + " " + ampm;
  } else {
    strTime = " 0" + hours + ":" + minutes + " " + ampm;
  }

  return [date.getFullYear(), month, day].join("-") + strTime;
}

const useStyles = makeStyles(() => ({
  card: {
    width: "100%",
    borderRadius: 16,
    boxShadow: "0 8px 16px 0 #BDC9D7",
    overflow: "scroll",
  },
  header: {
    fontFamily: "Barlow, san-serif",
    backgroundColor: "#fff",
  },
  headline: {
    color: "#122740",
    fontSize: "1.25rem",
    fontWeight: 600,
  },
  link: {
    color: "#2281bb",
    padding: "0 0.25rem",
    fontSize: "0.875rem",
  },
  actions: {
    color: "#BDC9D7",
  },
  divider: {
    backgroundColor: "#d9e2ee",
    margin: "0 20px",
  },
}));
const sortContact = (contacts, setContactList, type) => {
  if (contacts !== undefined) {
    switch (type) {
      case "firstName":
        contacts.sort((a, b) =>
          a.contact.firstName.localeCompare(b.contact.firstName),
        );

        break;
      case "lastName":
        contacts.sort((a, b) =>
          a.contact.lastName.localeCompare(b.contact.lastName),
        );

        break;
      case "occupation":
        contacts.sort((a, b) =>
          a.contact.occupation.localeCompare(b.contact.occupation),
        );
        for (let i = 0; i < contacts.length; i++) {}
        break;
      case "notes":
        contacts.sort((a, b) => a.contact.note.localeCompare(b.contact.note));

        break;

      case "addDate":
        console.log(contacts[0]);
        contacts.sort((a, b) =>
          convert(a.contact.addDate).localeCompare(convert(b.contact.addDate)),
        );
        for (let i = 0; i < contacts.length; i++) {
          console.log(contacts[i].contact.addDate);
        }
        break;

      case "Null":
        break;
      default:
        break;
    }
  }
};

export const PersonInfo = ({ prop }) => {
  return <div className="personInfo"></div>;
};
