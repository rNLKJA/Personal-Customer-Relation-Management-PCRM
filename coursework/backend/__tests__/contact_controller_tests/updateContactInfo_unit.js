// allow to send http request to our app
const mongoose = require("mongoose");

const Contact = require("../../models/contactSchema");
const Record = require("../../models/recordSchema");
const { User } = require("../../models/userSchema");

const contactController = require("../../controller/contactController");

describe("unit test of updateContactInfo form contactController.js", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    body: {
      _id: "615454b320f2bc5738d53e1b",
      lastName: "Bing",
      firstName: "hi",
      phone: [],
      email: [],
      occupation: "test",
      note: "",
    },
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

    Contact.findOneAndUpdate = jest.fn().mockResolvedValue({
      email: [],
      phone: [],
      lastName: "Bing",
      firstName: "hi",
      occupation: "test",
      __v: 0,
    });

    Contact.findOneAndUpdate.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue({
        email: [],
        phone: [],
        lastName: "Bing",
        firstName: "hi",
        occupation: "test",
      }),
    }));

    contactController.updateContactInfo(req, res);
  });

  test("Test case 1: give a contact Id, able to get the contact detail after update", () => {
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      status: true,
      contact: {
        email: [],
        phone: [],
        lastName: "Bing",
        firstName: "hi",
        occupation: "test",
      },
    });
  });
});

describe("Unit testing updateContactInfo from contactController with invalid contact Id", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    body: { _id: "123456789012" },
  };

  const res = {
    send: jest.fn(),
    json: jest.fn(),
  };

  beforeAll(() => {
    res.send.mockClear();
    res.json.mockClear();

    Contact.findOneAndUpdate = jest.fn().mockResolvedValue();

    Contact.findOneAndUpdate.mockImplementationOnce(() => {
      throw new Error();
    });

    contactController.updateContactInfo(req, res);
  });

  test("test case 1: testing with invalid user id, excepting error message", () => {
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ status: false });
  });
});
