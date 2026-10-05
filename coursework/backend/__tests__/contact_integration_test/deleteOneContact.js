// supertest allows us to send HTTP requests to our app
// install it: npm install supertest --save-dev
const { ContextBuilder } = require("express-validator/src/context-builder");
const request = require("supertest");
const app = require("../../app");
const mongoose = require("mongoose");

describe("Integration test: Test for Show Contact", () => {
  let agent = request.agent(app);

  // store the token
  let jwtToken = null;

  let contactId = null;
  
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

  test("Test 1: create a contact", () => {
    return agent
      .post("/contact/createContactOneStep")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        lastName: "TestDelete",
        firstName: "TestDelete",
        email: "12345678@qq.com",
        phone: "4152864185",
        occupation: "student",
        note: "testing",
        customField: "testCustomField"
      })
      .then((res) => {
        expect(res.body.status).toBe(true);
        contactId = res.body.contactId;
      });
  });

  test("Test 2: delete a contact with contact id", () => {
    return agent
      .get("/contact/deleteOneContact/IntegrationTest_DontDelete/" + contactId)
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({})
      .then((res) => {
        expect(res.body.status).toBe("success");
      });
  });

  test("Test 3: delete a contact with invalid contact id", () => {
    return agent
      .get("/contact/deleteOneContact/IntegrationTest_DontDelete/" + "123456789")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({})
      .then((res) => {
        expect(res.body.status).toBe("failed");
      });
  });

});