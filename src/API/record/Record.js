// import { Input } from "@material-ui/icons";
// import Select from "react-select";
import React, { useState, useEffect } from "react";
import "./record.css";
import Error from "../error/Error";
import "font-awesome/css/font-awesome.min.css";
import { useShowAllRecords } from "../../BackEndAPI/recordAPI";
import RecordDetail from "./recordDetail";
// import add_record from "./add-record.jpg";
import Heading from "../heading/heading.jsx";
import Navbar from "../nav/Navbar";
import { Grid } from "@material-ui/core";
// import AddCommentIcon from "@mui/icons-material/AddComment";
// import Box from "@mui/material/Box";
// import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/Add";
// import EditIcon from "@mui/icons-material/Edit";
// import FavoriteIcon from "@mui/icons-material/Favorite";
// import NavigationIcon from "@mui/icons-material/Navigation";
import { Link } from "react-router-dom";
import EditRecord from "./editRecord";
import { useContacts } from "../../BackEndAPI/contactAPI";
import TextField from "@mui/material/TextField";
// import { makeStyles } from "@material-ui/styles";
import Select from "react-select";
// import { Button } from "react-bootstrap";

// const useRecordStyles = makeStyles(() => ({
//   text: {
//     fontFamily: "Barlow, san-serif",
//     whiteSpace: "nowrap",
//     textOverflow: "ellipsis",
//     overflow: "hidden",
//   },
//   name: {
//     fontWeight: 600,
//     fontSize: "1rem",
//     color: "#122740",
//   },
//   caption: {
//     fontSize: "0.8rem",
//     color: "#758392",
//     marginTop: -4,
//   },
//   btn: {
//     borderRadius: 20,
//     padding: "0.125rem 0.75rem",
//     borderColor: "#becddc",
//     fontSize: "0.75rem",
//   },
// }));

const Record = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { contacts } = useContacts();
  // const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const { loading, records, error } = useShowAllRecords();
  const [recordList, setRecordList] = useState();
  const [count, setCount] = useState(9);
  records.sort((b, a) =>
    convert(a.dateTime).localeCompare(convert(b.dateTime)),
  );
  if (false) {
    console.log(recordList);
  }

  const [oneRecord, setOneRecord] = useState({
    meetingPerson: "",
    location: "",
    occupation: "",
    notes: "",
    dateTime: "",
    selected: false,
  });
  const [selectedOption, setSelectedOption] = useState({
    value: null,
    label: "Null",
  });
  const options = [
    { value: "firstName", label: "First Name" },
    { value: "lastName", label: "Last Name" },
    { value: "location", label: "Location" },
    { value: "notes", label: "Notes" },
    { value: "time", label: "Time" },
    { value: null, label: "All" },
  ];

  const handleChange = (e) => {
    e.preventDefault();
    setSearchTerm(e.target.value);
  };

  const handleOptions = (selectedOption) => {
    setSelectedOption(selectedOption);
    sortRecord(records, setRecordList, selectedOption.value);
  };

  useEffect(() => {
    document.title = "Record";
  }, []);

  if (error) {
    return (
      <React.Fragment>
        <Navbar />
        <Heading />
        <div className="sub-container">
          <Error msg={"There is something wrong with Contact X_X"} />
        </div>
      </React.Fragment>
    );
  }

  if (loading) {
    return (
      <React.Fragment>
        <Navbar />
        <Heading />
        <div className="sub-container">
          <h1 data-testid="record-loading" hidden>
            record-loading
          </h1>
          <div className="loading">
            <h1>Loading Your Record</h1>
            <h1>(っ˘ω˘ς )</h1>
          </div>
        </div>
      </React.Fragment>
    );
  }

  const moreRecords = () => {
    setCount(count + 9);
  };

  return (
    <React.Fragment>
      <Navbar />
      <Heading />

      <div className="sub-container">
        {!oneRecord.selected && (
          <React.Fragment>
            <div className="heading-record">
              <h1>Record</h1>
              <Link to="/createRecord">
                <div className="record-add-btn">
                  <AddIcon sx={{ width: "50px", height: "50px" }} />
                </div>
              </Link>
            </div>

            <div className="record-container">
              <div
                style={{
                  width: "90%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "Left",
                  marginLeft: "10px",
                }}
              >
                <TextField
                  id="standard-basic"
                  label="Search at here!!"
                  style={{ width: "100%", marginTop: 10 }}
                  value={searchTerm}
                  onChange={(e) => handleChange(e)}
                />
                <Select
                  /*                  value = {selectedOption}*/
                  onChange={handleOptions}
                  options={options}
                  style={{
                    marginTop: "5px",
                    // marginRight: "5px",
                    fontSize: "1.9rem",
                    zIndex: 10,
                  }}
                />
              </div>
              {console.log(records)}
              <RecordList
                records={records}
                search_key={searchTerm}
                loading={loading}
                error={error}
                setOneRecord={setOneRecord}
                options={selectedOption.value}
                setCount={setCount}
                moreRecords={moreRecords}
                count={count}
              />
            </div>
            {count < records.length ? (
              <div className="change-slice">
                <button
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    fontWeight: "bold",
                    marginBottom: 10,
                  }}
                  onClick={moreRecords}
                >
                  More
                </button>
              </div>
            ) : null}
          </React.Fragment>
        )}
        {oneRecord.selected && (
          <>
            <EditRecord
              record={oneRecord}
              setOneRecord={setOneRecord}
              contacts={contacts}
            />
          </>
        )}
      </div>
    </React.Fragment>
  );
};

export default Record;

export const RecordList = (prop) => {
  const searchRecords = () => {
    if (prop.records !== undefined) {
      switch (prop.options) {
        case "firstName":
          return prop.records.filter((record) =>
            record.meetingPerson.firstName
              .toLowerCase()
              .includes(prop.search_key.toLowerCase()),
          );

        case "lastName":
          return prop.records.filter((record) =>
            record.meetingPerson.lastName
              .toLowerCase()
              .includes(prop.search_key.toLowerCase()),
          );

        case "location":
          return prop.records.filter((record) =>
            record.location
              .toLowerCase()
              .includes(prop.search_key.toLowerCase()),
          );

        case "notes":
          return prop.records.filter((record) =>
            record.notes.toLowerCase().includes(prop.search_key.toLowerCase()),
          );
        case "time":
          return prop.records.filter((record) =>
            convert(record.dateTime)
              .toLowerCase()
              .includes(prop.search_key.toLowerCase()),
          );
        case null:
          // console.log("NULL")
          return prop.records.filter((record) =>
            (
              record.meetingPerson.firstName +
              " " +
              record.meetingPerson.lastName +
              " " +
              convert(record.dateTime) +
              " " +
              record.notes +
              " " +
              record.location
            )
              .toLowerCase()
              .includes(prop.search_key.toLowerCase()),
          );
        default:
          break;
      }
    }
  };

  let fitterRecords = searchRecords();

  return (
    <Grid container justifyContent="flex-start" alignItems="center">
      {fitterRecords.length >= 1 ? (
        fitterRecords.slice(0, prop.count).map((record) => {
          return (
            <Grid
              key={record._id + new Date().toISOString()}
              item
              xs={12}
              sm={6}
              md={4}
            >
              <RecordDetail record={record} setOneRecord={prop.setOneRecord} />
            </Grid>
          );
        })
      ) : (
        <div className="sub-container">
          <div className="loading">
            <h1>You don't have any record</h1>
            <h1>(っ˘ω˘ς )</h1>
          </div>
        </div>
      )}
    </Grid>
  );
};

export const OneRecord = (prop) => {
  return (
    <div
      className="col-md-4 animated fadeIn"
      onClick={() => {
        prop.setOneRecord({ ...prop.record, selected: true });
      }}
    >
      <div className="card">
        <div className="card-body">
          <div className="avatar">
            <i className="fa fa-users"></i>
          </div>
          <h3 className="card-title">
            {prop.record.meetingPerson
              ? prop.record.meetingPerson.firstName +
                " " +
                prop.record.meetingPerson.lastName
              : "Contact_id is invalid, please check"}
          </h3>
          <p className="card-text">
            <i className="fa fa-location-arrow"></i>
            {" " + prop.record.location}
            <br />
            <i className="fa fa-phone"></i>{" "}
            {" " + prop.record.meetingPerson.phone}
            <br />
            {convert(prop.record.dateTime)}
          </p>
        </div>
      </div>
    </div>
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

const sortRecord = (records, setRecordList, type) => {
  if (records) {
    switch (type) {
      case "firstName":
        records.sort((a, b) =>
          a.meetingPerson.firstName.localeCompare(b.meetingPerson.firstName),
        );
        break;
      case "lastName":
        records.sort((a, b) =>
          a.meetingPerson.lastName.localeCompare(b.meetingPerson.lastName),
        );
        break;
      case "location":
        records.sort((a, b) => a.location.localeCompare(b.location));
        break;
      case "notes":
        records.sort((a, b) => a.notes.localeCompare(b.notes));
        break;
      case "time":
        console.log(records[0].dateTime);
        records.sort((a, b) =>
          convert(a.dateTime).localeCompare(convert(b.dateTime)),
        );
        for (let i of records) {
          console.log(i.notes);
        }
        break;
      case "SearchAll":
        break;
      default:
        return records;
    }
  }
};
