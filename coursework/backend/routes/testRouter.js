// import required libraries
const express = require("express");

// define the router
const testRouter = express.Router();

// path environment variable
const path = require("path");

testRouter.get("/UnitTestIntegrationTestReport", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../public/Test documents/test-report.html"),
    );
});




module.exports = testRouter;