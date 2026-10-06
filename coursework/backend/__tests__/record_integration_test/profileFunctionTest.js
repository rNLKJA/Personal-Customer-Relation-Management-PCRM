// supertest allows us to send HTTP requests to our app
// install it: npm install supertest --save-dev
const { ContextBuilder } = require("express-validator/src/context-builder");
const request = require("supertest");
const app = require("../../app");
const mongoose = require("mongoose");

describe("Integration test: Test for profile", () => {
  let agent = request.agent(app);

  // store the token
  let jwtToken = null;

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

  test("Test 1: show the user file", () => {
    return agent
      .get("/profile/showProfile")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({})
      .then((res) => {
        expect(res.statusCode).toBe(200);
        expect(res.text).not.toContain("show fail");
      });
  });

  test("Test 2: test the edit firstName Function", () => {
    return agent
      .post("/profile/editFirstName")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        firstName: "Hongji",
      })
      .then((res) => {
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain("update success");
      });
  });

  test("Test 2: test the edit lastName Function", () => {
    return agent
      .post("/profile/editLastName")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        lastName: "Huang",
      })
      .then((res) => {
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain("update success");
      });
  });

  test("Test 3: test the edit occupation Function", () => {
    return agent
      .post("/profile/editOccupation")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        occupation: "student",
      })
      .then((res) => {
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain("update success");
      });
  });

  test("Test 4: test the edit status Function", () => {
    return agent
      .post("/profile/editStatus")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        status: "Single",
      })
      .then((res) => {
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain("update success");
      });
  });

  test("Test 5: test the add phone Function", () => {
    return agent
      .post("/profile/addPhone")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        phone: "0453456582",
      })
      .then((res) => {
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain("update success");
      });
  });

  test("Test 6: test the del phone Function", () => {
    return agent
      .post("/profile/delPhone")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        phone: "0453456582",
      })
      .then((res) => {
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain("delete success");
      });
  });

  test("Test 7: test the add email Function", () => {
    return agent
      .post("/profile/addEmail")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        email: "hohuang@student.unimelb.edu.au",
      })
      .then((res) => {
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain("update success");
      });
  });

  test("Test 8: test the del email Function", () => {
    return agent
      .post("/profile/delEmail")
      .set("Content-Type", "application/json")
      .set("Authorization", jwtToken)
      .send({
        email: "hohuang@student.unimelb.edu.au",
      })
      .then((res) => {
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain("delete success");
      });
  });
});
