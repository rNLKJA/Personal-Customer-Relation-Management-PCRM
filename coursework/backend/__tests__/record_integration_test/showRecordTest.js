// supertest allows us to send HTTP requests to our app
// install it: npm install supertest --save-dev
const { ContextBuilder } = require("express-validator/src/context-builder");
const request = require("supertest");
const app = require("../../app");
const mongoose = require("mongoose");

describe("Integration test: Test for show Record", () => {
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

  test("Test 1: can show the record list", () => {
    return agent
      .post("/record/editRecord")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({})
      .then((res) => {
        expect(res.statusCode).toBe(200);
        expect(res.text.body).not.toBeNull();
      });
  });

});
