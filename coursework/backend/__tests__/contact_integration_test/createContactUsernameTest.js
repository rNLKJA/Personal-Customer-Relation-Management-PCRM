// supertest allows us to send HTTP requests to our app
// install it: npm install supertest --save-dev
const { ContextBuilder } = require("express-validator/src/context-builder");
const request = require("supertest");
const app = require("../../app");
const mongoose = require("mongoose");

describe("Integration test: Test for Create Contact by UserName", () => {
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

  test("Test 1: Creat a contact with Username of other account", () => {
    return agent
      .post("/contact/createContactByUserName")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        userName: "IntegrationTest2_DontDelete"
      })
      .then((res) => {
        expect(res.body.status).toBe(true);
        contactId = res.body.contactId;
      });
  });

  test("Test 2: Creat a contact without username", () => {
    return agent
      .post("/contact/createContactByUserName")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        userName: null
      })
      .then((res) => {
        expect(res.body.status).toBe(false);
        expect(res.body.msg).toBe("Cannot find user!");
        contactId = null;
      });
  });

  test("Test 3: Creat a contact with invalid username", () => {
    return agent
      .post("/contact/createContactByUserName")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        userName: "NullAccount"
      })
      .then((res) => {
        expect(res.body.status).toBe(false);
        expect(res.body.msg).toBe("Query Failure");
        contactId = null;
      });
  });

});
