// supertest allows us to send HTTP requests to our app
// install it: npm install supertest --save-dev
const { ContextBuilder } = require("express-validator/src/context-builder");
const request = require("supertest");
const app = require("../../app");
const mongoose = require("mongoose");

describe("Integration test: Test for Update Contact", () => {
  let agent = request.agent(app);

  // store the token
  let jwtToken = null;
  
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

  test("Test 1: Update a contact without last name", () => {
    return agent
      .post("/contact/updateContactInfo")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        _id: "618503c2ad6a53001643245e",
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
      });
  });

  test("Test 2: Update a contact without firstName", () => {
    return agent
      .post("/contact/updateContactInfo")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        _id: "618503c2ad6a53001643245e",
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
      });
  });

  test("Test 3: Update a contact without email", () => {
    return agent
      .post("/contact/updateContactInfo")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        _id: "618503c2ad6a53001643245e",
        lastName: "Hongji",
        firstName: "Huang",
        email: null,
        phone: "4152864185",
        occupation: "student",
        note: "testing",
        customField: "testCustomField"
      })
      .then((res) => {
        expect(res.body.status).toBe(false);
      });
  });

  test("Test 4: Update a contact without phone number", () => {
    return agent
      .post("/contact/updateContactInfo")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        _id: "618503c2ad6a53001643245e",
        lastName: "Hongji",
        firstName: "Huang",
        email: "12345678@qq.com",
        phone: null,
        occupation: "student",
        note: "testing",
        customField: "testCustomField"
      })
      .then((res) => {
        expect(res.body.status).toBe(false);
      });
  });

  test("Test 5: Update a contact without occupation", () => {
    return agent
      .post("/contact/updateContactInfo")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        _id: "618503c2ad6a53001643245e",
        lastName: "Hongji",
        firstName: "Huang",
        email: "12345678@qq.com",
        phone: "4152864185",
        occupation: null,
        note: "testing",
        customField: "testCustomField"
      })
      .then((res) => {
        expect(res.body.status).toBe(false);
      });
  });

  test("Test 6: Update a contact without note", () => {
    return agent
      .post("/contact/updateContactInfo")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        _id: "618503c2ad6a53001643245e",
        lastName: "Hongji",
        firstName: "Huang",
        email: "12345678@qq.com",
        phone: "4152864185",
        occupation: "student",
        note: null,
        customField: "testCustomField"
      })
      .then((res) => {
        expect(res.body.status).toBe(true);
      });
  });

  test("Test 7: Update a contact without customField", () => {
    return agent
      .post("/contact/updateContactInfo")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        _id: "618503c2ad6a53001643245e",
        lastName: "Hongji",
        firstName: "Huang",
        email: "12345678@qq.com",
        phone: "4152864185",
        occupation: "student",
        note: "testing",
        customField: null
      })
      .then((res) => {
        expect(res.body.status).toBe(true);
      });
  });

  test("Test 8: Update a contact without contact id", () => {
    return agent
      .post("/contact/updateContactInfo")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        _id: null,
        lastName: "Hongji",
        firstName: "Huang",
        email: "12345678@qq.com",
        phone: "4152864185",
        occupation: "student",
        note: "testing",
        customField: "testCustomField"
      })
      .then((res) => {
        expect(res.body.status).toBe(false);
      });
  });

  test("Test 8: Update a contact with invalid contact id", () => {
    return agent
      .post("/contact/updateContactInfo")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        _id: "123456789",
        lastName: "Hongji",
        firstName: "Huang",
        email: "12345678@qq.com",
        phone: "4152864185",
        occupation: "student",
        note: "testing",
        customField: "testCustomField"
      })
      .then((res) => {
        expect(res.body.status).toBe(false);
      });
  });

});