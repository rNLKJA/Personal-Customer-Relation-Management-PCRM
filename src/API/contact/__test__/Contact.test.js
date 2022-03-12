import React from "react";
import Contact from "../Contact.js";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { BrowserRouter } from "react-router-dom";

test("Contact component testing, check the render ability of the app", () => {
  // render the componenet
  render(
    <BrowserRouter>
      <Contact />
    </BrowserRouter>,
  );

  // obtain the headerElement
  const pageHeading = screen.getByTestId("contact");
  expect(pageHeading.textContent).toBe("Contact Page");
});
