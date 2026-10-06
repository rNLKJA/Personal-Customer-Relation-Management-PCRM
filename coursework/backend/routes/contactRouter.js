const express = require("express");

const contactRouter = express.Router();

const expressValidator = require("express-validator");

const contactController = require("../controller/contactController.js");
const passport = require("passport");
const { upload } = require("../config/upload");
require("../config/passport")(passport);

contactRouter.get("/");

contactRouter.post(
  "/createContact",
  passport.authenticate("jwt", { session: false }),
  (req, res) => contactController.createNewContact(req, res)
);

contactRouter.post(
  "/createContactByUserName",
  passport.authenticate("jwt", { session: false }),
  (req, res) => contactController.createContactbyUserName(req, res)
);

contactRouter.get(
  "/showContact",
  passport.authenticate("jwt", { session: false }),
  (req, res) => contactController.showAllContact(req, res)
);

contactRouter.post(
  "/showOneContact",
  passport.authenticate("jwt", { session: false }),
  (req, res) => contactController.showOneContact(req, res)
);

contactRouter.get(
  "/deleteOneContact/:userName/:contact_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => contactController.deleteOneContact(req, res)
);

contactRouter.post(
  "/uploadContactImage",
  passport.authenticate("jwt", { session: false }),
  upload.single("portrait"),
  (req, res) => contactController.contactPhotoUpload(req, res)
);

contactRouter.post(
  "/updateContactInfo",
  passport.authenticate("jwt", { session: false }),
  upload.single("portrait"),
  (req, res) => contactController.updateContactInfo(req, res)
);

contactRouter.post(
  "/searchContact",
  passport.authenticate("jwt", { session: false }),
  (req, res) => contactController.searchContact(req, res)
);

contactRouter.post(
  "/synchronizationContactInfo",
  passport.authenticate("jwt", { session: false }),
  (req, res) => contactController.synchronizationContactInfo(req, res)
);

contactRouter.post(
  "/connectContactToAccount",
  passport.authenticate("jwt", { session: false }),
  (req, res) => contactController.linkToAccount(req, res)
);

contactRouter.post(
  "/createContactOneStep",
  passport.authenticate("jwt", { session: false }),
  upload.single("portrait"),
  (req, res) => contactController.createContactOneStep(req, res)
);

module.exports = contactRouter;
