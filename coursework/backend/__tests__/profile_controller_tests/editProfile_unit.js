const mongoose = require("mongoose");

const Contact = require("../../models/contactSchema");
const Record = require("../../models/recordSchema");
const { User } = require("../../models/userSchema");
const userModel = User;

const profileController = require("../../controller/profileController");

describe("unit test of editProfile form profileController.js", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    body: {
      firstName: "Hongji",
      lastName: "Huang",
      status: true,
      phone: ["123414"],
      email: ["125134@134.com"],
      occupation: "student",
    },
  };

  const res = {
    send: jest.fn(),
    json: jest.fn(),
  };

  beforeAll(() => {
    res.send.mockClear();
    res.json.mockClear();

    userModel.findOneAndUpdate = jest.fn().mockResolvedValue({
      firstName: "Hongji",
      lastName: "Huang",
      status: true,
      phone: ["123414"],
      email: ["125134@134.com"],
      occupation: "student",
    });

    uploadPhotoOneStep = jest.fn().mockResolvedValue([]);
    profileController.editProfile(req, res);
  });

  test("Test case 1: edit profile with correct id", () => {
    expect(userModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "61503926028ce448aceda136" },
      {
        $set: {
          firstName: "Hongji",
          lastName: "Huang",
          status: true,
          phone: ["123414"],
          email: ["125134@134.com"],
          occupation: "student",
        },
      },
      { upsert: true, new: true }
    );
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith("update success");
  });
});

describe("unit test of editProfile form profileController.js invalid situation", () => {
  const req = {
    user: { _id: "123456" },
    body: {
      firstName: "Hongji",
      lastName: "Huang",
      status: true,
      phone: ["123414"],
      email: ["125134@134.com"],
      occupation: "student",
    },
  };

  const res = {
    send: jest.fn(),
    json: jest.fn(),
  };

  beforeAll(() => {
    res.send.mockClear();
    res.json.mockClear();

    userModel.findOneAndUpdate = jest.fn().mockResolvedValue();
    userModel.findOneAndUpdate.mockImplementation(() => {
      let err = new Error();
      throw err;
    });
    profileController.editProfile(req, res);
  });

  test("Test case 1: edit Record with incorrect contact id", () => {
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith("update fail");
  });
});
