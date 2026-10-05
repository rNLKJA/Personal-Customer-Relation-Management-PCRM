// supertest allows us to send HTTP requests to our app
// install it: npm install supertest --save-dev
const { ContextBuilder } = require("express-validator/src/context-builder");
const request = require("supertest");
const app = require("../../app");
const mongoose = require("mongoose");

describe("Integration test: Test for Create Contact", () => {
  let agent = request.agent(app);

  // store the token
  let jwtToken = null;

  var contactId = null;
  
  jest.setTimeout(20000)

  beforeAll(() =>
    agent
      .post("/user/login")
      .set("Content-Type", "application/json")
      .send({
        userName: "IntegrationTest_DontDelete",
        password: "testtest123",
      })
      .then((res) => {
        jwtToken = res.body.token;
      })
  );

  afterAll((done) => {
    // Closing the DB connection allows Jest to exit successfully.
    mongoose.connection.close();
    done();
  });

  afterEach(() => {
      return agent
        .get("/contact/deleteOneContact/IntegrationTest_DontDelete/" + contactId)
        .set("Content-Type", "application/json")
        .set("Authorization", jwtToken)
        .send({});
  })

  test("Test 1: Creat a contact without last name", () => {
    return agent
      .post("/contact/createContactOneStep")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        lastName: null,
        firstName: "Huang",
        email: "12345678@qq.com",
        phone: "4152864185",
        occupation: "student",
        note: "testing",
        customField: "testCustomField"
      })
      .then((res) => {
        expect(res.body.status).toBe(false);
        contactId = null;
      });
  });

  test("Test 2: Creat a contact without firstName", () => {
    return agent
      .post("/contact/createContactOneStep")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        lastName: "Hongji",
        firstName: null,
        email: "12345678@qq.com",
        phone: "4152864185",
        occupation: "student",
        note: "testing",
        customField: "testCustomField"
      })
      .then((res) => {
        expect(res.body.status).toBe(false);
        contactId = null;
      });
  });

  test("Test 3: Creat a contact without email", () => {
    return agent
      .post("/contact/createContactOneStep")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        lastName: "Hongji",
        firstName: "Test3",
        email: null,
        phone: "4152864185",
        occupation: "student",
        note: "testing",
        customField: "testCustomField"
      })
      .then((res) => {
        expect(res.body.status).toBe(false);
        contactId = null;
      });
  });

  test("Test 4: Creat a contact without phone number", () => {
    return agent
      .post("/contact/createContactOneStep")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        lastName: "Hongji",
        firstName: "Test4",
        email: "12345678@qq.com",
        phone: null,
        occupation: "student",
        note: "testing",
        customField: "testCustomField"
      })
      .then((res) => {
        expect(res.body.status).toBe(false);
        contactId = null;
      });
  });

  test("Test 5: Creat a contact without occupation", () => {
    return agent
      .post("/contact/createContactOneStep")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        lastName: "Hongji",
        firstName: "Test5",
        email: "12345678@qq.com",
        phone: "4152864185",
        occupation: null,
        note: "testing",
        customField: "testCustomField"
      })
      .then((res) => {
        expect(res.body.status).toBe(false);
        contactId = null;
      });
  });

  test("Test 6: Creat a contact without note", () => {
    return agent
      .post("/contact/createContactOneStep")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        lastName: "Hongji",
        firstName: "Test6",
        email: "12345678@qq.com",
        phone: "4152864185",
        occupation: "student",
        note: null,
        customField: "testCustomField"
      })
      .then((res) => {
        expect(res.body.status).toBe(true);
        contactId = res.body.contactId;
      });
  });

  test("Test 7: Creat a contact without customField", () => {
    return agent
      .post("/contact/createContactOneStep")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        lastName: "Hongji",
        firstName: "Test7",
        email: "12345678@qq.com",
        phone: "4152864185",
        occupation: "student",
        note: "testing",
        customField: null
      })
      .then((res) => {
        expect(res.body.status).toBe(true);
        contactId = res.body.contactId;
      });
  });

  test("Test 8: Creat a contact with duplicate", () => {
    return agent
      .post("/contact/createContactOneStep")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        lastName: "Hongji",
        firstName: "CheckDuplicate",
        email: [],
        phone: [],
        occupation: "Student",
        note: "",
        customField: []
      })
      .then((res) => {
        expect(res.body.status).toBe(false);
        expect(res.body.msg).toBe("dupcontact/createProblem");
        contactId = null;
      });
  });

});
