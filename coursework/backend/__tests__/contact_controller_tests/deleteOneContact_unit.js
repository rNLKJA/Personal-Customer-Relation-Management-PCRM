// allow to send http request to our app
const mongoose = require("mongoose");
const Contact = require("../../models/contactSchema");
const Record = require("../../models/recordSchema");
const { User } = require("../../models/userSchema");

const contactController = require("../../controller/contactController");

describe("unit test of deleteOneContact form contactController.js", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136", userName: "test" },
    params: { contact_id: "615549ec49ed3c0016a6a18a" },
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
      contactList: [
        { contact: "test_id" },
        { contact: "615549ec49ed3c0016a6a18a" },
      ],
    });

    User.findOne.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue({
        email: [],
        phone: [],
        lastName: "test",
        firstName: "test",
        occupation: "test",
        contactList: [
          { contact: "test_id" },
          { contact: "615549ec49ed3c0016a6a18a" },
        ],
        recordList: ["4399", "1234567890", "1983408"],
      }),
    }));

    Record.find = jest
      .fn()
      .mockResolvedValue([{ _id: "1234567890" }, { _id: "4399" }]);

    Record.find.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue([{ _id: "1234567890" }, { _id: "4399" }]),
    }));
    User.findOneAndUpdate = jest.fn().mockResolvedValue();
    Contact.deleteOne = jest.fn().mockResolvedValue();
    Record.deleteMany = jest.fn().mockResolvedValue();

    contactController.deleteOneContact(req, res);
  });

  test("Test case 1: give a contact Id, able to delete contact", () => {
    expect(User.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { userName: "test" },
      { contactList: [{ contact: "test_id" }], recordList: ["1983408"] }
    );
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
    });
  });
});

describe("Unit testing deleteOneContact from contactController with invalid contact Id", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    params: { contact_id: "1234567894", userName: "test" },
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

    User.findOne = jest.fn().mockResolvedValue();

    User.findOne.mockImplementation(() => {
      let err = new Error();
      throw err;
    });

    // User.findOneAndUpdate = jest.fn().mockResolvedValue();
    // Contact.deleteOne = jest.fn().mockResolvedValue();
    // Contact.deleteOne.mockImplementationOnce(() => {
    //     throw new Error();
    // });

    contactController.deleteOneContact(req, res);
  });

  test("test case 1: testing with fail dabase query, excepting error message", () => {
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ status: "failed" });
  });
});
