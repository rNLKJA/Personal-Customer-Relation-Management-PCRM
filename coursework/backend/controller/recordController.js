const mongoose = require("mongoose");
const Record = mongoose.model("Record");
const passport = require("passport");
const User = mongoose.model("User");
const Contact = mongoose.model("Contact");
const { populate } = require("../models/recordSchema");

require("../config/passport")(passport);

/**
 * create a new Record Function
 * @param {express.Request} req - information json for add a record
 * @param {express.Response} res - response from the system.
 */
const createRecord = async (req, res) => {
  /*
    request header: user
    request body:
    {  
        "contact_id": "6131e5b0e0accb25d09663f6",
        "location": "University of Melbourne",
        "dateTime": "2021-10-01T10:28:10.018Z",
        "geoCoords": {
            "lat": "122334545", 
            "lng":"52123456"
        },
        "notes": "account",
        "customField": "testCustomField"
    }
  */

  try {
    let err = new Error("Database query failed");
    const { contact_id, location, dateTime, geoCoords, notes, customField } = req.body;
    if (contact_id == null || location == null) {
      err = Error("Miss Important Information Input");
      throw err;
    }
    const date = new Date();
    const offset = date.getTimezoneOffset();
    if (dateTime == null) {
      dateTimeOut = date.getTime() - offset * 1000 * 60;
    } else {
      dateTimeOut = dateTime;
    }
    var meetingPerson = await Contact.findOne({
      _id: mongoose.Types.ObjectId(contact_id),
    }).lean();
    if (meetingPerson == null) throw err;
    var lat;
    var lng;
    if (geoCoords == null) {
      lat = null;
      lng = null;
    } else {
      lat = geoCoords.lat;
      lng = geoCoords.lng;
    }

    const newRecord = await Record.create({
      meetingPerson: contact_id,
      dateTime: dateTimeOut,
      location: location,
      notes: notes,
      //"linkedAccount" : linkedAccount,
      ownerAccount: req.user._id,
      lat: lat,
      lng: lng,
      customField: customField,
    });

    await newRecord.save();
    await User.findOneAndUpdate(
      { _id: req.user._id },
      {
        $push: {
          recordList: newRecord._id,
        },
      }
    );

    res.json(newRecord);
  } catch (err) {
    if (err.message == "Miss Important Information Input") {
      res.send(err.message);
    } else {
      res.send("Database query failed");
    }
  }
};

/**
 * show all records for the user 
 * @param {express.Request} req - the _id of the user that you want to show records.
 * @param {express.Response} res - response from the system.
 */
const showAllRecords = async (req, res) => {
  try {
    const ownerAccount = await User.findOne({
      _id: mongoose.Types.ObjectId(req.user._id),
    }).lean();
    const recordListIds = ownerAccount.recordList;
    recordList = new Array();
    var order;
    for (order in recordListIds) {
      record = await Record.findOne({
        _id: mongoose.Types.ObjectId(recordListIds[order]),
      })
        .populate("meetingPerson")
        .populate("linkedAccount")
        .lean();
      recordList.push(record);
    }
    if (recordList != null) res.json(recordList);
  } catch (err) {
    res.send("Database query failed");
  }
};

/**
 * search the records for the user, by meetingPerson or location or occupation
 * @param {express.Request} req - the query json from front end
 * @param {express.Response} res - response from the system.
 */
const searchRecord = async (req, res) => {
  const validationErrors = expressValidator.validationResult(req);
  if (!validationErrors.isEmpty()) {
    return res.status(422).render("error", {
      errorCode: "422",
      message: "Search works on alphabet characters only.",
    });
  }
  var query = {};

  if (req.body.meetingPerson != "") {
    query["meetingPerson"] = {
      $regex: new RegExp(req.body.meetingPerson, "i"),
    };
  }
  if (req.body.location != "") {
    query["location"] = { $regex: new RegExp(req.body.location, "i") };
  }
  if (req.body.occupation != "") {
    query["occupation"] = { $regex: new RegExp(req.body.occupation, "i") };
  }
  if (req.body.dateTime != "") {
    try {
      const searchDate = new Date(req.body.dateTime);
      var matchRecords = await Record.find({
        dateTime: { $lt: searchDate.getTime() },
      });
      res.json(matchRecords);
      return;
    } catch (err) {
      console.log(err);
    }
  }
  try {
    const records = await Record.find(query).lean();
    res.json(records);
  } catch (err) {
    console.log(err);
  }
};

/**
 * function that will delete one record from database
 * @param {express.Request} req - contain recordId that need to be deleted
 * @param {express.Response} res - response from the system.
 */
const deleteOneRecord = async (req, res) => {
  try {
    const recordId = req.body.recordId;
    const user = await User.findOne({ _id: req.user._id }).lean();

    var recordList = user.recordList.filter(
      (record) => record.toString() !== req.body.recordId
    );

    await Record.deleteOne({ _id: mongoose.Types.ObjectId(recordId) });
    await User.findOneAndUpdate(
      { _id: mongoose.Types.ObjectId(req.user._id) },
      { recordList: recordList }
    );
    res.json({ status: "success" });
  } catch (err) {
    res.json({ status: "failed" });
  }
};


/**
 * edit the records
 * @param {express.Request} req - the edit information of the records 
 * @param {express.Response} res - response from the system.
 */
const editRecord = async (req, res) => {
  /*
    request header: user
    request body:
    {   
        "_id": "61695204687a7c05e401666e", 
        "contact_id": "6131e5b0e0accb25d09663f6",
        "location": "University of Melbourne",
        "dateTime": "2021-10-01T10:28:10.018Z",
        "geoCoords": {
            "lat": "122334545", 
            "lng": "52123456"
        },
        "notes": "account",
        "customField": "testCustomField"
    }
  */
  try {
    let err = new Error("Database query failed");
    
    const { _id, contact_id, location, dateTime, geoCoords, notes, customField } = req.body;
    if (_id == null || contact_id == null || location == null) {
      err = Error("Miss Important Information Input");
      throw err;
    }
    const date = new Date();
    const offset = date.getTimezoneOffset();
    if (dateTime == null) {
      dateTimeOut = date.getTime() - offset * 1000 * 60;
    } else {
      dateTimeOut = dateTime;
    }

    var meetingPerson = await Contact.findOne({
      _id: mongoose.Types.ObjectId(contact_id),
    }).lean();

    if (meetingPerson == null) throw err;
    var lat;
    var lng;
    if (geoCoords == null) {
      lat = null;
      lng = null;
    } else {
      lat = geoCoords.lat;
      lng = geoCoords.lng;
    }

    var record = await Record.findOneAndUpdate(
      { _id: mongoose.Types.ObjectId(_id) },
      {
        $set: {
          meetingPerson: contact_id,
          dateTime: dateTimeOut,
          location: location,
          notes: notes,
          //"linkedAccount" : linkedAccount,
          ownerAccount: req.user._id,
          lat: lat,
          lng: lng,
          customField: customField,
        }
      }
      //{ new: true }
    ).lean();
    
    record = await Record.findOne({_id: mongoose.Types.ObjectId(record._id)}).lean();

    res.json(record);
  } catch (err) {
    if (err.message == "Miss Important Information Input") {
      res.send(err.message);
    } else {
      res.send("Database query failed");
    }
  }
};

module.exports = {
  createRecord,
  showAllRecords,
  searchRecord,
  deleteOneRecord,
  editRecord
};
