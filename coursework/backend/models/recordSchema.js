// mongodb schema
const mongoose = require("mongoose");

// create mongoose schema
const recordSchema = new mongoose.Schema({
  // Name of meeting person
  meetingPerson: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
  dateTime: { type: Date },
  location: { type: String, required: true },
  notes: { type: String },
  pictures: [
    {
      data: Buffer,
      contentType: String,
    },
  ],
  linkedAccount: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  ownerAccount: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lat: { type: Number, require: true },
  lng: { type: Number, require: true },
  customField: { type: Array },
});

const Record = mongoose.model("Record", recordSchema);

module.exports = Record;
