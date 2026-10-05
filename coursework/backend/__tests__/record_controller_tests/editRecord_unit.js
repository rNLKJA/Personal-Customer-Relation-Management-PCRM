const mongoose = require("mongoose");

const Contact = require("../../models/contactSchema");
const Record = require("../../models/recordSchema");
const { User } = require("../../models/userSchema");

const recordController = require("../../controller/recordController");

describe("unit test of editRecord form recordController.js", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    body: {
      _id: "61503926028ce448aceda136",
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

    Record.findOneAndUpdate = jest.fn().mockResolvedValue({
      meetingPerson: "615a1395adfb0c0016f8ba06",
      location: "UoM",
      dateTime: "2021-5-1",
      lat: "31.44554",
      lng: "48.84845",
      notes: "",
      linkedAccount: null,
      ownerAccount: "61503926028ce448aceda136",
    });

    Record.findOneAndUpdate.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue({
        meetingPerson: "615a1395adfb0c0016f8ba06",
        location: "UoM",
        dateTime: "2021-5-1",
        lat: "31.44554",
        lng: "48.84845",
        notes: "",
        linkedAccount: null,
        ownerAccount: "61503926028ce448aceda136",
      }),
    }));

    Record.findOne = jest.fn().mockResolvedValue({
      meetingPerson: "615a1395adfb0c0016f8ba06",
      location: "UoM",
      dateTime: "2021-5-1",
      lat: "31.44554",
      lng: "48.84845",
      notes: "",
      linkedAccount: null,
      ownerAccount: "61503926028ce448aceda136",
    });

    Record.findOne.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue({
        meetingPerson: "615a1395adfb0c0016f8ba06",
        location: "UoM",
        dateTime: "2021-5-1",
        lat: "31.44554",
        lng: "48.84845",
        notes: "",
        linkedAccount: null,
        ownerAccount: "61503926028ce448aceda136",
      }),
    }));

    recordController.editRecord(req, res);
  });

  test("Test case 1: edit Record with correct contact id that doesn't have a account", () => {
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
    });
  });
});

describe("unit test of editRecord form recordController.js invalid situation", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    body: {
      _id: "61503926028ce448aceda136",
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

    Record.findOneAndUpdate = jest.fn().mockResolvedValue({
      meetingPerson: "615a1395adfb0c0016f8ba06",
      location: "UoM",
      dateTime: "2021-5-1",
      lat: "31.44554",
      lng: "48.84845",
      notes: "",
      linkedAccount: null,
      ownerAccount: "61503926028ce448aceda136",
    });

    Record.findOneAndUpdate.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue({
        meetingPerson: "615a1395adfb0c0016f8ba06",
        location: "UoM",
        dateTime: "2021-5-1",
        lat: "31.44554",
        lng: "48.84845",
        notes: "",
        linkedAccount: null,
        ownerAccount: "61503926028ce448aceda136",
      }),
    }));

    Record.findOne = jest.fn().mockResolvedValue({
      meetingPerson: "615a1395adfb0c0016f8ba06",
      location: "UoM",
      dateTime: "2021-5-1",
      lat: "31.44554",
      lng: "48.84845",
      notes: "",
      linkedAccount: null,
      ownerAccount: "61503926028ce448aceda136",
    });

    Record.findOne.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue({
        meetingPerson: "615a1395adfb0c0016f8ba06",
        location: "UoM",
        dateTime: "2021-5-1",
        lat: "31.44554",
        lng: "48.84845",
        notes: "",
        linkedAccount: null,
        ownerAccount: "61503926028ce448aceda136",
      }),
    }));

    Contact.findOne = jest.fn().mockResolvedValue(null);

    Contact.findOne.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue(null),
    }));
    recordController.editRecord(req, res);
  });

  test("Test case 1: edit Record with incorrect contact id", () => {
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith("Database query failed");
  });
});

describe("unit test of editRecord form recordController.js invalid situation", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    body: {
      _id: "61503926028ce448aceda136",
      contact_id: "615a1395adfb0c0016f8ba06",
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

    Record.findOneAndUpdate = jest.fn().mockResolvedValue({
      meetingPerson: "615a1395adfb0c0016f8ba06",
      location: "UoM",
      dateTime: "2021-5-1",
      lat: "31.44554",
      lng: "48.84845",
      notes: "",
      linkedAccount: null,
      ownerAccount: "61503926028ce448aceda136",
    });

    Record.findOneAndUpdate.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue({
        meetingPerson: "615a1395adfb0c0016f8ba06",
        location: "UoM",
        dateTime: "2021-5-1",
        lat: "31.44554",
        lng: "48.84845",
        notes: "",
        linkedAccount: null,
        ownerAccount: "61503926028ce448aceda136",
      }),
    }));

    Record.findOne = jest.fn().mockResolvedValue({
      meetingPerson: "615a1395adfb0c0016f8ba06",
      location: "UoM",
      dateTime: "2021-5-1",
      lat: "31.44554",
      lng: "48.84845",
      notes: "",
      linkedAccount: null,
      ownerAccount: "61503926028ce448aceda136",
    });

    Record.findOne.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue({
        meetingPerson: "615a1395adfb0c0016f8ba06",
        location: "UoM",
        dateTime: "2021-5-1",
        lat: "31.44554",
        lng: "48.84845",
        notes: "",
        linkedAccount: null,
        ownerAccount: "61503926028ce448aceda136",
      }),
    }));

    Contact.findOne = jest.fn().mockResolvedValue(null);

    Contact.findOne.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue(null),
    }));
    recordController.editRecord(req, res);
  });

  test("Test case 1: edit Record with missing information", () => {
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith("Miss Important Information Input");
  });
});
