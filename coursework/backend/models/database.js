const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");

// REDACTED (revival, 2026): the original file hard-coded MongoDB Atlas
// connection strings (including credentials) for both Heroku and local runs.
// Those credentials were leaked publicly and the Atlas cluster is gone, so they
// have been removed. Supply your own database via environment variables:
//   MONGODB_URI=mongodb://localhost:27017      (or your own Atlas URI)
// The database name ("CRM") is still selected below via dbName.
const dbAddress = process.env.MONGODB_URI || "mongodb://localhost:27017";

// connect to mongodb database
mongoose.connect(dbAddress, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  dbName: "CRM",
});

// connect to the database
const db = mongoose.connection;

db.on("error", (err) => {
  console.error(err);
  process.exit(1);
});

db.once("open", async () => {
  console.log("Mongo connection started on " + db.host + ":" + db.port);
});

// obtain the database schemas

require("./connection_test_schema");
require("./contactSchema");
require("./recordSchema");
require("./userSchema");
require("./emailAuthSchema");
require("./fastRegisterSchema");
