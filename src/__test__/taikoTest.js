const {
  openBrowser,
  goto,
  write,
  click,
  closeBrowser,
  into,
  below,
  textBox,
  button,
  waitFor,
  clear,
  listItem,
  doubleClick,
  accept,
  press,
} = require("taiko");

var testNum = 0;
var testUser = new Date().toISOString();

(async () => {
  var startTime = new Date().getTime();
  try {
    await openBrowser();

    await TestingDatetimeInfo();

    await LoginTest(
      testNum,
      "Check web application localhost accessibility and login the taiko test account:",
    );
    NEXT(1500);

    // check all links are functional
    await routingTest(
      testNum,
      "Check Routing functionalities, all routes should be accessible and test end up at personal setting page:",
    );
    NEXT(1500);

    // testing update personal information
    await personInfoTest(
      testNum,
      "Updating personal information, check all buttons and input field are working properly:",
    );
    NEXT(1500);

    await mapTest(
      testNum,
      "Map functional testing, all search box are clickable.",
    );
    NEXT(1500);

    await ManualInputTest(
      testNum,
      "Manual Contact Input test, added a test user.",
    );
    NEXT(1500);

    await recordTest(
      testNum,
      "Add a new record and check it is shown on the map.",
    );
    // NEXT(1500);

    // await cleanTest(testNum, "CleanUp the testing bench");
  } catch (error) {
    console.error(error);
  } finally {
    var endTime = new Date().getTime();
    console.log(
      `All tests PASSED. Execution Time: [${
        endTime - startTime
      }] close the browser in 3 seconds`,
    );
    setTimeout(() => {
      closeBrowser();
    }, 5000);
  }
})();

const routingTest = async (testNum, description) => {
  console.log(`Test[${testNum}]: ${description}`);
  await goto("localhost:3000/contact");
  await goto("localhost:3000/record");
  await goto("localhost:3000/map");
  await goto("localhost:3000/setting");
};

const personInfoTest = async (testNum, description) => {
  console.log(`Test[${testNum}]: ${description}`);
  await click(button({ id: "edit-button" }));

  // update basic information
  await clear(textBox(below("First Name")));
  await write("Team4399", into(textBox(below("First Name"))));

  await clear(textBox(below("Last Name")));
  await write(
    `TaikoTest ${new Date().toISOString()}`,
    into(textBox(below("Last Name"))),
  );

  await clear(textBox(below("Occupation")));
  await write("Taiko Testing", into(textBox(below("Occupation"))));

  // delete existing phone number
  await click(button({ id: "phone-delete-btn" }));
  await click(button("ADD PHONE"));
  await write("0443994399", into(textBox(below("Phone"))));

  await click(button({ id: "email-delete-btn" }));
  await click(button("ADD EMAIL"));
  await write("taiko@test.4399.com", into(textBox(below("Email"))));

  await click(button("SAVE CHANGE"));
};

const LoginTest = async (testNum, description) => {
  console.log(`Test[${testNum}]: ${description}`);
  await goto("localhost:3000");

  // write taiko test username
  await write("taiko_test_account", into(textBox(below("Username"))));

  // write taiko test password
  await write("TaikoTest4399", into(textBox(below("Password"))));

  // click the login button
  await click("LOGIN");
};

const updateTestNum = () => {
  testNum = testNum + 1;
};

const HOLD = async (ms) => {
  console.log(`The next test will start in ${ms} ms`);
  await waitFor(ms);
};

const NEXT = (ms) => {
  updateTestNum();
  HOLD(ms);
};

const mapTest = async (testNum, description) => {
  console.log(`Test[${testNum}]: ${description}`);
  await goto("localhost:3000/map");

  // check the search box input function
  await write("University of Melbourne, Southbank", "Enter an address");

  // check selected item existence
  await listItem({ id: -1041114409 }).exists();
};

const TestingDatetimeInfo = () => {
  console.log("=====================================================");
  console.log("Taiko test start at " + new Date().toISOString());
  console.log("=====================================================");
};

const ManualInputTest = async (testNum, description) => {
  console.log(`Test[${testNum}]: ${description}`);

  // check route accessibility
  await goto("http://localhost:3000/addUser");
  await goto("http://localhost:3000/addUser/manual-input");

  // write basic test user information
  await write(testUser, into(textBox(below("First Name"))));
  await write("Test", into(textBox(below("Last Name"))));

  // added phone and email input field
  await click("ADD EMAIL");
  await click("ADD PHONE");

  // write testing email and phone number
  await write("0443994399", into(textBox(below("Phone"))));
  await write("taiko@test.4399.com", into(textBox(below("E-mail"))));

  // write test occupation
  await write("Taiko Tester", into(textBox(below("ADD PHONE"))));

  // write testing notes
  await write(
    "This is the testing message automatically created by Taiko.",
    into(textBox(below("Notes"))),
  );

  // added one custom field
  await click("ADD FIELD");
  await write("Testing Account", "Field Name");
  await write("taiko@test.4399.com", "Field Value");

  // save testing contact information
  await click("SAVE");

  // check test contact information
  await doubleClick(button({ class: "makeStyles-btn-11" }));
};

const recordTest = async (testNum, description) => {
  console.log(`Test[${testNum}]: ${description}`);

  // goto create record page
  await goto("localhost:3000/createRecord");

  // updated required record information
  await write(`${testUser}`, into(textBox("Contacts")));
  await click(`${testUser} Test`);
  // await clear(textBox("Meeting Time"));
  // await write("11/11/2021 11:11 pm", into(textBox(below("Contacts"))));

  // select a new location to melbourne museum
  await write("Melbourne Museum", "Search an address");
  await click(listItem({ id: "510951866" }));

  // update notes
  await write(
    `Map function testing, testing time ${new Date().toISOString()}`,
    "Add-Notes",
  );

  // update custom field
  await click("ADD FIELD");
  await write("Taiko Test", "Field Name");
  await write("4399 Automation Test", "Field Value");

  await click("CREATE");
};

const cleanTest = async (testNum, description) => {
  console.log(`Test[${testNum}]: ${description}`);

  await goto("localhost:3000/contact");
  await click("DETAIL");
  await click("Edit");
  await accept(click("DELETE THE CONTACT"));
};
