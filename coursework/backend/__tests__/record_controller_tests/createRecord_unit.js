const mongoose = require("mongoose");

const Contact = require("../../models/contactSchema");
const Record = require("../../models/recordSchema");
const { User } = require("../../models/userSchema");

const recordController = require("../../controller/recordController");

describe("unit test of createRecord form recordController.js", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    body: {
      contact_id: "615a1395adfb0c0016f8ba06",
      location: "UoM",
      dateTime: "2021-5-1",
      geoCoords: {
        lat: "31.44554",
        lng: "48.84845",
      },
      notes: "",
    },
  };

  const res = {
    send: jest.fn(),
    json: jest.fn(),
  };

  beforeAll(() => {
    res.send.mockClear();
    res.json.mockClear();

    Contact.findOne = jest.fn().mockResolvedValue({
      email: [],
      phone: [],
      lastName: "Bin",
      firstName: "test",
      occupation: "test",
      linkedAccount: null,
      __v: 0,
    });

    Contact.findOne.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue({
        email: [],
        phone: [],
        lastName: "Bin",
        firstName: "test",
        occupation: "test",
        linkedAccount: null,
      }),
    }));

    User.findOneAndUpdate = jest.fn().mockResolvedValue({
      email: [],
      phone: [],
      lastName: "Huang",
      firstName: "test",
      occupation: "test",
      __v: 0,
    });

    User.findOneAndUpdate.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue({
        email: [],
        phone: [],
        lastName: "Huang",
        firstName: "test",
        occupation: "test",
      }),
    }));
    save = jest.fn();
    Record.create = jest.fn().mockResolvedValue({
      meetingPerson: "615a1395adfb0c0016f8ba06",
      location: "UoM",
      dateTime: "2021-5-1",
      lat: "31.44554",
      lng: "48.84845",
      notes: "",
      linkedAccount: null,
      ownerAccount: "61503926028ce448aceda136",
      save: save,
    });
    recordController.createRecord(req, res);
  });

  test("Test case 1: create Record with correct contact id that doesn't have a account", () => {
    expect(Record.create).toHaveBeenCalledTimes(1);
    expect(Record.create).toHaveBeenCalledWith({
      meetingPerson: "615a1395adfb0c0016f8ba06",
      location: "UoM",
      dateTime: "2021-5-1",
      lat: "31.44554",
      lng: "48.84845",
      notes: "",
      ownerAccount: "61503926028ce448aceda136",
      customField: undefined,
    });
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      meetingPerson: "615a1395adfb0c0016f8ba06",
      location: "UoM",
      dateTime: "2021-5-1",
      lat: "31.44554",
      lng: "48.84845",
      notes: "",
      linkedAccount: null,
      ownerAccount: "61503926028ce448aceda136",
      save: save,
    });
  });
});

describe("unit test of createRecord form recordController.js invalid situation", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    body: {
      contact_id: "615a1395adfb0c0016f8ba06",
      location: "UoM",
      dateTime: "2021-5-1",
      geoCoords: {
        lat: "31.44554",
        lng: "48.84845",
      },
      notes: "",
    },
  };

  const res = {
    send: jest.fn(),
    json: jest.fn(),
  };

  beforeAll(() => {
    res.send.mockClear();
    res.json.mockClear();

    Contact.findOne = jest.fn().mockResolvedValue(null);

    Contact.findOne.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue(null),
    }));

    User.findOne = jest.fn().mockResolvedValue({
      email: [],
      phone: [],
      lastName: "Huang",
      firstName: "test",
      occupation: "test",
      __v: 0,
    });

    User.findOne.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue({
        email: [],
        phone: [],
        lastName: "Huang",
        firstName: "test",
        occupation: "test",
      }),
    }));

    User.findOneAndUpdate = jest.fn().mockResolvedValue([]);

    Record.create = jest.fn().mockResolvedValue({
      meetingPerson: "615a1395adfb0c0016f8ba06",
      location: "UoM",
      dateTime: "2021-5-1",
      lat: "31.44554",
      lng: "48.84845",
      notes: "",
      linkedAccount: null,
      ownerAccount: "61503926028ce448aceda136",
      save: () => {},
    });
    recordController.createRecord(req, res);
  });

  test("Test case 1: create Record with incorrect contact id", () => {
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith("Database query failed");
  });
});
