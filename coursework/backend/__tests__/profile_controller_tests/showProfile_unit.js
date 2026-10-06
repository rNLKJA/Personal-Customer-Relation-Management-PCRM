const mongoose = require("mongoose");

const Contact = require("../../models/contactSchema");
const Record = require("../../models/recordSchema");
const { User } = require("../../models/userSchema");

const profileController = require("../../controller/profileController");

describe("unit test of showProfile form profileController.js", () => {
  const req = {
    user: {
      firstName: "test",
      lastName: "test",
      userName: "test123",
      occupation: "test",
      status: true,
      email: ["1234"],
      phone: ["1234"],
    },
    body: {},
  };

  const res = {
    send: jest.fn(),
    json: jest.fn(),
  };

  // jest.mock("models", ()=> {
  //     return {
  //         ContactList : jest.fn().mockImplementation(() => { return {} })
  //     }
  // });

  beforeAll(() => {
    res.send.mockClear();
    res.json.mockClear();

    profileController.showProfile(req, res);
  });

  test("Test case 1: return all user information if req.user exist", () => {
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      firstName: "test",
      lastName: "test",
      userName: "test123",
      occupation: "test",
      status: true,
      email: ["1234"],
      phone: ["1234"],
    });
  });
});

describe("Unit testing showProfile from profileController without auth", () => {
  const req = {
    body: {},
  };

  const res = {
    send: jest.fn(),
    json: jest.fn(),
  };

  beforeAll(() => {
    res.send.mockClear();
    res.json.mockClear();
    profileController.showProfile(req, res);
  });

  test("test case 1: testing with invalid user, excepting error message", () => {
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith("show fail");
  });
});
