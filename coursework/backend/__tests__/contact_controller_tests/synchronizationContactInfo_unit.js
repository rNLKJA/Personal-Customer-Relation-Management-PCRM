// allow to send http request to our app
const mongoose = require("mongoose");

const Contact = require("../../models/contactSchema");
const Record = require("../../models/recordSchema");
const { User } = require("../../models/userSchema");

const contactController = require("../../controller/contactController");

describe("unit test of synchronizationContactInfo form contactController.js", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    body: { _idOfContact: "615454b320f2bc5738d53e1b" },
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
      linkedAccount: "12345",
    });

    Contact.findOne.mockImplementationOnce(() => ({
      populate: jest.fn().mockReturnValue({
        email: [],
        phone: [],
        lastName: "test",
        firstName: "test",
        occupation: "test",
        linkedAccount: {
          email: [],
          phone: [],
          lastName: "Zizizi",
          firstName: "test",
          occupation: "test",
        },
      }),
      populate: jest.fn().mockImplementationOnce(() => ({
        lean: jest.fn().mockReturnValue({
          email: [],
          phone: [],
          lastName: "test",
          firstName: "test",
          occupation: "test",
          linkedAccount: {
            email: [],
            phone: [],
            lastName: "Zizizi",
            firstName: "test",
            occupation: "test",
          },
        }),
      })),
    }));

    Contact.findOneAndUpdate = jest.fn().mockResolvedValue({
      email: [],
      phone: [],
      lastName: "Zizizi",
      firstName: "test",
      occupation: "test",
      linkedAccount: "12345",
    });

    Contact.findOneAndUpdate.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue({
        email: [],
        phone: [],
        lastName: "Zizizi",
        firstName: "test",
        occupation: "test",
        linkedAccount: "12345",
      }),
    }));

    mongoose.Types.ObjectId = jest
      .fn()
      .mockReturnValue("615454b320f2bc5738d53e1b");
    contactController.synchronizationContactInfo(req, res);
  });

  test("Test case 1: give a contact Id, able to get the contact detail after update", () => {
    expect(Contact.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(Contact.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: "615454b320f2bc5738d53e1b",
      },
      {
        lastName: "Zizizi",
      },
      {
        new: true,
      }
    );
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      email: [],
      phone: [],
      lastName: "Zizizi",
      firstName: "test",
      occupation: "test",
      linkedAccount: "12345",
    });
  });
});

describe("Unit testing synchronizationContactInfo from contactController with fail database query", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    body: { _idOfContact: "123456789012" },
  };

  const res = {
    send: jest.fn(),
    json: jest.fn(),
  };

  beforeAll(() => {
    res.send.mockClear();
    res.json.mockClear();

    Contact.findOne = jest.fn().mockResolvedValue();

    Contact.findOne.mockImplementation(() => {
      let err = new Error();
      throw err;
    });

    contactController.synchronizationContactInfo(req, res);
  });

  test("test case 1: testing with invalid user id, excepting error message", () => {
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith("update failed");
  });
});
