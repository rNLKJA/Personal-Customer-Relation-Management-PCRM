// import required libraries
const express = require("express");

// define the router
const apiRouter = express.Router();

// path environment variable
const path = require("path");

apiRouter.get("/testing", (req, res) => {
  res.send("testing");
});

apiRouter.get("/contactController", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/API documents/contactController.html"),
  );
});

apiRouter.get("/recordController", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/API documents/recordController.html"),
  );
});

apiRouter.get("/emailAuth", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/API documents/emailAuth.html"));
});

apiRouter.get("/profileController", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/API documents/profileController.html"),
  );
});

apiRouter.get("/userController", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/API documents/userController.html"),
  );
});

apiRouter.get("/contactAPI", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/API documents/contactAPI.html"));
});

apiRouter.get("/profileAPI", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/API documents/profileAPI.html"));
});

apiRouter.get("/recordAPI", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/API documents/recordAPI.html"));
});

apiRouter.get("*", (req, res) => {
  res.redirect("/api/contactController");
});

module.exports = apiRouter;
