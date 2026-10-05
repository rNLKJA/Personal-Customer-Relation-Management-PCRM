// allow to send http request to our app
const mongoose = require("mongoose");

const Contact = require("../../models/contactSchema");
const Record = require("../../models/recordSchema");
const { User } = require("../../models/userSchema");

const contactController = require("../../controller/contactController");

describe("unit test of createNewContact form contactController.js", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
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

    User.findOne = jest.fn().mockResolvedValue({
      userName: "test",
      email: [],
      phone: [],
      lastName: "test",
      firstName: "test",
      occupation: "test",
      contactList: [{ contact: "test_id" }],
      populate: jest.fn(),
    });

    User.findOne.mockImplementationOnce(() => ({
      populate: jest.fn().mockReturnValueOnce({
        userName: "test",
        email: [],
        phone: [],
        lastName: "test",
        firstName: "test",
        occupation: "test",
        contactList: [{ contact: "replace" }],
      }),
      populate: jest.fn().mockImplementationOnce(() => ({
        lean: jest.fn().mockReturnValue({
          userName: "test",
          email: [],
          phone: [],
          lastName: "test",
          firstName: "test",
          occupation: "test",
          contactList: [{ contact: "replace" }],
        }),
      })),
    }));

    // User.findOne.mockImplementation(() => ({
    //     lean: jest.fn().mockResolvedValue({
    //         userName: "test",
    //         email: [],
    //         phone:[],
    //         lastName: "test",
    //         firstName: "test",
    //         occupation: "test",
    //         contactList: {contact: "test_id"},
    //     })
    // }))

    contactController.showAllContact(req, res);
  });

  test("Test case 1: give a user'id return a list of object(contact)", () => {
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith([
      {
        contact: "replace",
      },
    ]);
  });
});

describe("Unit testing showAllContact from contactController with invalid userId", () => {
  const req = {
    user: {
      _id: "wrong Id",
    },
  };

  const res = {
    send: jest.fn(),
  };

  beforeAll(() => {
    res.send.mockClear();

    User.findOne = jest.fn().mockResolvedValue();

    User.findOne.mockImplementation(() => {
      throw new Error();
    });

    contactController.showAllContact(req, res);
  });

  test("test case 1: testing with invalid user id, excepting error message", () => {
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith("database query fail");
  });
});
