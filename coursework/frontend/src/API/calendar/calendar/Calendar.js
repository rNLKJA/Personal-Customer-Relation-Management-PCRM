// import required dependencies
import React from "react";
import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const ReactCalendar = () => {
  const [date, setDate] = useState(new Date());

  // create onchange function
  const ChangeHandler = (date) => {
    setDate(date);
  };

  // return calendar component
  return (
    <React.Fragment>
      <div className="calendar">
        <Calendar
          showWeekNumbers
          hover
          onChange={ChangeHandler}
          value={date}
        ></Calendar>

        {/* display the selected date :: time won't update */}
        <p>{date.toLocaleString("en-US", { timeZone: "Australia/Sydney" })}</p>
      </div>
    </React.Fragment>
  );
};

export default ReactCalendar;
