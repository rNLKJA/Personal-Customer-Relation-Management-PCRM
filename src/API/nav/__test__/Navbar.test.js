import React from "react";
import Navbar from "../Navbar.js";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { BrowserRouter } from "react-router-dom";

test("Navigation bar component testing, check the render ability of the app", () => {
  // render the componenet
  render(
    <BrowserRouter>
      <Navbar />
    </BrowserRouter>,
  );

  // obtain the headerElement
  const contactIcon = screen.getByAltText("contact-icon");
  const recordIcon = screen.getByAltText("record-icon");
  const mapIcon = screen.getByAltText("map-icon");
  const setIcon = screen.getByAltText("set-icon");

  expect(contactIcon.src).toContain("contact.png");
  expect(contactIcon).toHaveAttribute("src", "contact.png");

  expect(recordIcon.src).toContain("record.png");
  expect(recordIcon).toHaveAttribute("src", "record.png");

  expect(mapIcon.src).toContain("map.png");
  expect(mapIcon).toHaveAttribute("src", "map.png");

  expect(setIcon.src).toContain("set.png");
  expect(setIcon).toHaveAttribute("src", "set.png");

  const validation = screen.queryByText("/4399 CRM/");
  expect(validation).not.toBeInTheDocument();
  // console.log(validation);
});
