// mongodb schema
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const contactListSchema = new mongoose.Schema({
  contact: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
  addSince: { type: Date, required: true, default: Date.now },
});
/*
const recordListSchema = new mongoose.Schema({
    record: { type: mongoose.Schema.Types.ObjectId, ref: "Record" },
    meetingTime: { type: Date, required: true, default: Date.now },
});
*/
// create mongoose schema
const userSchema = new mongoose.Schema({
  userName: { type: String, unique: true },
  email: { type: Array, required: true },
  password: { type: String, required: true },
  lastName: { type: String },
  firstName: { type: String },
  portrait: {
    // store profile picture
    data: Buffer,
    contentType: String,
  },
  occupation: { type: String },
  phone: { type: Array },
  status: { type: String }, // active, pending ? if only two status, consider use boolean
  contactList: [contactListSchema], // store a list of contact objects
  recordList: [{ type: mongoose.Schema.Types.ObjectId, ref: "Record" }],
});

userSchema.methods.generateHash = function (password) {
  return bcrypt.hash(password, 10);
};

userSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};

const User = mongoose.model("User", userSchema);
const ContactList = mongoose.model("ContactList", contactListSchema);
module.exports = { User, ContactList };
