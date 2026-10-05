const express = require("express");

const profileRouter = express.Router();
const cors = require("cors");
const profileController = require("../controller/profileController.js");
const passport = require("passport");
const { upload } = require("../config/upload");
require("../config/passport")(passport);
// const photoUpload = require('../config/upload')

profileRouter.post(
  "/addPhone",
  passport.authenticate("jwt", { session: false }),
  (req, res) => profileController.addPhone(req, res)
);

profileRouter.post(
  "/delPhone",
  passport.authenticate("jwt", { session: false }),
  (req, res) => profileController.delPhone(req, res)
);

profileRouter.post(
  "/addEmail",
  passport.authenticate("jwt", { session: false }),
  (req, res) => profileController.addEmail(req, res)
);

profileRouter.post(
  "/delEmail",
  passport.authenticate("jwt", { session: false }),
  (req, res) => profileController.delEmail(req, res)
);

profileRouter.post(
  "/editFirstName",
  passport.authenticate("jwt", { session: false }),
  (req, res) => profileController.editFirstName(req, res)
);

profileRouter.post(
  "/editLastName",
  passport.authenticate("jwt", { session: false }),
  (req, res) => profileController.editLastName(req, res)
);

profileRouter.post(
  "/editOccupation",
  passport.authenticate("jwt", { session: false }),
  (req, res) => profileController.editOccupation(req, res)
);

profileRouter.post(
  "/editStatus",
  passport.authenticate("jwt", { session: false }),
  (req, res) => profileController.editStatus(req, res)
);

profileRouter.post(
  "/editProfile",
  passport.authenticate("jwt", { session: false }),
  upload.single("portrait"),
  (req, res) => profileController.editProfile(req, res)
);

profileRouter.get(
  "/showProfile",
  passport.authenticate("jwt", { session: false }),
  (req, res) => profileController.showProfile(req, res)
);

profileRouter.post(
  "/uploadUserImage",
  cors(),
  passport.authenticate("jwt", { session: false }),
  upload.single("portrait"),
  (req, res) => profileController.uploadPhoto(req, res)
);

profileRouter.get(
  "/displayImage",
  passport.authenticate("jwt", { session: false }),
  profileController.displayImage
);

module.exports = profileRouter;
