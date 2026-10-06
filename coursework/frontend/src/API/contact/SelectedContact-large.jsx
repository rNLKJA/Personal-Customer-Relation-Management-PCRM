import React from "react";

const SelectedContact_large = ({ oneContact }) => {
  <div className="contactDetail">
    <img
      src={require("./portrarit.png")}
      alt="protrait.png"
      style={{ paddingTop: "15px" }}
    />
    <div className="name">
      <label>First Name: </label>
      {oneContact.firstName}
    </div>
    <div className="name">
      <label>Last Name: </label>
      {oneContact.lastName}
    </div>
    <div className="occupation">
      <label>Occupation: </label>
      {oneContact.occupation}
    </div>
    <div className="linkedAccount">
      <label>Linked Account: </label>
      {oneContact.linkedAccount}
    </div>
    <div className="email">
      {oneContact.email.map((mail) => {
        return (
          <label key={new Date().toISOString()}>Email Address: {mail}</label>
        );
      })}
    </div>
    <div className="phone">
      {oneContact.phone.map((phone) => {
        return (
          <label
            key={new Date().toISOString()}
            style={{ color: "rgb(47,71,137)" }}
          >
            Phone: {phone}
          </label>
        );
      })}
    </div>
    <div className="note" style={{ height: "300px" }}>
      <input value={oneContact.note}></input>
    </div>
  </div>;
};

export default SelectedContact_large;
