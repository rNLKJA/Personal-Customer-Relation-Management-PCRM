import React from "react";
import Record from "../Record.js";
import { render, screen,waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { BrowserRouter } from "react-router-dom";

test("loads and display record list", async () => {

  // render the componenet
  render(
    <BrowserRouter>
      <Record />
    </BrowserRouter>,
  );

  // obtain the headerElement
  const pageHeading = screen.getByTestId("record-loading");

  expect(pageHeading.textContent).toBe("record-loading");

});
