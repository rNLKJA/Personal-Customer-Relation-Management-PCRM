// allow to send http request to our app
const mongoose = require("mongoose");

const Contact = require("../../models/contactSchema");
const Record = require("../../models/recordSchema");
const { User } = require("../../models/userSchema");

const contactController = require("../../controller/contactController");

describe("unit test of searchContact form contactController.js with filter", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    body: {
      lastName: "Bin",
      firstName: "",
      phone: "",
      email: "",
      occupation: "",
      note: "",
      addDate: "",
      contactUserName: "",
      nofiller: false,
    },
  };

  const res = {
    send: jest.fn(),
    json: jest.fn(),
  };

  beforeAll(() => {
    res.send.mockClear();
    res.json.mockClear();

    Contact.find = jest.fn().mockResolvedValue([
      {
        email: [],
        phone: [],
        lastName: "Bin",
        firstName: "test",
        occupation: "test",
        __v: 0,
      },
    ]);

    Contact.find.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue([
        {
          email: [],
          phone: [],
          lastName: "Bin",
          firstName: "test",
          occupation: "test",
        },
      ]),
    }));

    contactController.searchContact(req, res);
  });

  test("Test case 1: basic search with last name in fillter mode", () => {
    expect(Contact.find).toHaveBeenCalledTimes(1);
    expect(Contact.find).toHaveBeenCalledWith({
      lastName: { $regex: new RegExp("Bin", "i") },
      ownerAccount: "61503926028ce448aceda136",
    });
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith([
      {
        email: [],
        phone: [],
        lastName: "Bin",
        firstName: "test",
        occupation: "test",
      },
    ]);
  });
});

describe("unit test of searchContact form contactController.js with filter in date", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    body: {
      lastName: "Bin",
      firstName: "",
      phone: "",
      email: "",
      occupation: "",
      note: "",
      addDate: "2021-10-5",
      contactUserName: "",
      nofiller: false,
    },
  };

  const res = {
    send: jest.fn(),
    json: jest.fn(),
  };

  beforeAll(() => {
    res.send.mockClear();
    res.json.mockClear();

    Contact.find = jest.fn().mockResolvedValue([
      {
        email: [],
        phone: [],
        lastName: "Bin",
        firstName: "test",
        occupation: "test",
        addDate: "2021-10-3",
        __v: 0,
      },
    ]);

    Contact.find.mockImplementationOnce(() => ({
      lean: jest.fn().mockReturnValue([
        {
          email: [],
          phone: [],
          lastName: "Bin",
          firstName: "test",
          occupation: "test",
          addDate: "2021-10-3",
        },
      ]),
    }));

    contactController.searchContact(req, res);
  });

  test("Test case 1: basic search with date in fillter mode", () => {
    expect(Contact.find).toHaveBeenCalledTimes(1);
    expect(Contact.find).toHaveBeenCalledWith({
      lastName: { $regex: new RegExp("Bin", "i") },
      ownerAccount: "61503926028ce448aceda136",
      addDate: { $lt: new Date("2021-10-06T00:00:00.000Z") },
    });
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith([
      {
        email: [],
        phone: [],
        lastName: "Bin",
        firstName: "test",
        occupation: "test",
        addDate: "2021-10-3",
      },
    ]);
  });
});

//TODO: mutiple chain function call need to mock
describe("unit test of searchContact form contactController.js in basic mode without fillter", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    body: {
      searchContent: "Bin Liang",
      lastName: "Bin",
      firstName: "",
      phone: "",
      email: "",
      occupation: "",
      note: "",
      addDate: "",
      contactUserName: "",
      nofiller: true,
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

    Contact.find = jest.fn().mockReturnValue([
      {
        email: [],
        phone: [],
        lastName: "Bin",
        firstName: "test",
        occupation: "test",
        __v: 0,
      },
      {
        email: [],
        phone: [],
        lastName: "test",
        firstName: "Bin",
        occupation: "test",
        __v: 0,
      },
    ]);

    Contact.find.mockImplementation(() => ({
      lean: jest.fn().mockReturnValue([
        {
          email: [],
          phone: [],
          lastName: "Bin",
          firstName: "test",
          occupation: "test",
        },
        {
          email: [],
          phone: [],
          lastName: "test",
          firstName: "Bin",
          occupation: "test",
        },
      ]),
    }));
    // .mockImplementationOnce(() => ({
    //     lean: jest.fn().mockReturnValue([{
    //         email: [],
    //         phone:[],
    //         lastName: "test",
    //         firstName: "Bin",
    //         occupation: "test",
    //         }]
    //     )
    // }))

    contactController.searchContact(req, res);
  });

  test("Test case 1: basic search with name without filter", () => {
    expect(Contact.find).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith([
      {
        email: [],
        phone: [],
        lastName: "Bin",
        firstName: "test",
        occupation: "test",
      },
      {
        email: [],
        phone: [],
        lastName: "test",
        firstName: "Bin",
        occupation: "test",
      },
    ]);
  });
});

describe("Unit testing searchContact from contactController with fail database query", () => {
  const req = {
    user: { _id: "61503926028ce448aceda136" },
    body: {
      lastName: "Bin",
      firstName: "",
      phone: "",
      email: "",
      occupation: "",
      note: "",
      addDate: "",
      contactUserName: "",
      nofiller: false,
    },
  };

  const res = {
    send: jest.fn(),
    json: jest.fn(),
  };

  beforeAll(() => {
    res.send.mockClear();
    res.json.mockClear();

    Contact.find = jest.fn().mockResolvedValue();

    Contact.find.mockImplementation(() => {
      let err = new Error();
      throw err;
    });

    contactController.searchContact(req, res);
  });

  test("test case 1: testing with database query failed, excepting error message", () => {
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith("search failed");
  });
});
