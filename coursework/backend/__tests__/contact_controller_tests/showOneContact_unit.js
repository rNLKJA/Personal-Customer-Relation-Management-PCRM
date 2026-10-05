// allow to send http request to our app
const mongoose = require("mongoose");

const Contact = require("../../models/contactSchema");
const Record = require("../../models/recordSchema");
const { User } = require("../../models/userSchema");

const contactController = require("../../controller/contactController");

describe("unit test of showOneContact form contactController.js", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    body: { _idOfContact: "615549ec49ed3c0016a6a18a" },
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

    Contact.findOne = jest.fn().mockResolvedValue({
      email: [],
      phone: [],
      lastName: "test",
      firstName: "test",
      occupation: "test",
      __v: 0,
    });

    Contact.findOne.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue({
        email: [],
        phone: [],
        lastName: "test",
        firstName: "test",
        occupation: "test",
      }),
    }));

    contactController.showOneContact(req, res);
  });

  test("Test case 1: give a contact Id, able to get the contact detail", () => {
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      email: [],
      phone: [],
      lastName: "test",
      firstName: "test",
      occupation: "test",
    });
  });
});

describe("Unit testing showOneContact from contactController with invalid contact Id", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    body: { _idOfContact: "123456789012" },
  };

  const res = {
    send: jest.fn(),
  };

  beforeAll(() => {
    res.send.mockClear();

    Contact.findOne = jest.fn().mockResolvedValue();

    Contact.findOne.mockImplementation(() => {
      let err = new Error();
      throw err;
    });

    contactController.showOneContact(req, res);
  });

  test("test case 1: testing with invalid user id, excepting error message", () => {
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(
      "Database query fail, something wrong with contact Id"
    );
  });
});
