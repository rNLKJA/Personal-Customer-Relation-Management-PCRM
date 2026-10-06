const { response } = require("express");
const ExpressHandlebars = require("express-handlebars/lib/express-handlebars");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
const EmailAuth = mongoose.model("EmailAuth");
const EmailRegister = mongoose.model("EmailRegister");
const emailStyle = require("./emailStyle.js");
const userModel = mongoose.model("User");

const transport = nodemailer.createTransport(
  smtpTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    // REDACTED (revival, 2026): the original hard-coded the team Gmail account
    // and its password here. Both were leaked publicly and have been removed.
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  }),
);

transport.verify(function (error, success) {
  if (error) {
    console.log(error);
  }
});
/**
 * this function can random generator a code with certain length
 * @param  {int} length length of the code generated
 */
const autoCodeGenerator = (length) => {
  var code = "";
  for (let i = 0; i < length; i++) {
    code += parseInt(Math.random() * 10);
  }
  return code;
};

// eamil reg for check form of input eamil
/**
 * this function will send a email that user input to implement email verify
 * @param  {express.Request} req this contains the eamil that user input when register
 * @param  {express.Response} res this contain the response from system of email sending result
 */
const emailAuthSend = async (req, res) => {
  const email = req.body.email; // read email from the request formdata field
  console.log(email);
  const authCode = autoCodeGenerator(6);
  transport.sendMail(
    {
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Vertify Your Email with Code",
      html: emailStyle(authCode),
    },
    function (error, data) {
      // assert(error, 500, "fail to send vertify code")
      transport.close();
    },
  );
  try {
    await EmailAuth.deleteMany({ email: email });
    const AuthDocument = new EmailAuth({ email: email, authCode: authCode });
    await AuthDocument.save();
    setTimeout(async () => {
      await EmailAuth.deleteMany({ email: email });
    }, 1000 * 60 * 5);
    res.json({ status: true });
  } catch (err) {
    console.log(err);
  }
};

/**
 * this function will compare the input verify code with database to finish email verify
 * @param  {express.Request} req this contains the email and verify code that user input
 * @param  {express.Response} res this contains the response of system if fail to verify
 * @param  {express.Next} next this will led to next (middleware) function
 */
const emailCodeVerify = async (req, res, next) => {
  const verify = await EmailAuth.find({
    email: req.body.email,
    authCode: req.body.authCode,
  });
  // console.log(verify);
  if (!verify.length) {
    return res.send({ status: false });
  }
  await EmailAuth.deleteMany({ email: req.body.email });
  delete req.body.authCode;
  // console.log(req.body);
  next();
};

/**
 * this function will send a link to user who register while others adding them as contact for finish register
 * @param  {express.Request} req contain temporary user information and object id
 * @param  {express.Request} res system response of result message of email sending
 *
 */
const emailRegisterCodeSend = async (req, res) => {
  const email = req.body.email;
  // get user id from previous middle ware function
  const registerAccount = res.locals._id; // read email from the request formdata field
  // console.log(email);

  const registerCode = autoCodeGenerator(10);
  //TODO:replace to front end website
  const fastRegisterLink =
    "https://pcrm4399.herokuapp.com/fastRegister/" +
    registerAccount +
    "/" +
    registerCode;
  transport.sendMail(
    {
      from: process.env.GMAIL_USER,
      to: email[0],
      subject: "Complete your register by access the Link",
      html: `<a>${fastRegisterLink}</a>`,
    },
    function (error, data) {
      console.log(error);
      // assert(error, 500, "fail to send vertify code")
      transport.close();
    },
  );

  try {
    await EmailRegister.deleteMany({
      registerAccount: mongoose.Types.ObjectId(registerAccount),
    });

    const RegisterDocument = new EmailRegister({
      registerAccount: mongoose.Types.ObjectId(registerAccount),
      fastRegisterCode: registerCode,
    });

    await RegisterDocument.save();

    setTimeout(async () => {
      await EmailRegister.deleteMany({
        registerAccount: mongoose.Types.ObjectId(registerAccount),
      });
    }, 1000 * 60 * 15);

    return res.send({ status: true, msg: "Email Code send" });
  } catch (err) {
    console.log(err);
  }

  console.log(req.body);
};

/**
 * this function will verify whether email register opened in right time range
 * @param  {express.Request} req contain information that user input to finish fast register
 * @param  {express.Response} res system response
 * @param  {express.Next} next this will led to next (middleware) function
 */
const emailRegisterVerify = async (req, res, next) => {
  const verify = await EmailRegister.findOne({
    registerAccount: mongoose.Types.ObjectId(req.body._id),
    fastRegisterCode: req.body.fastRegisterCode,
  });
  console.log(verify);
  if (verify !== null) {
    res.locals.authResult = 0;
    next();
  }
  res.locals.authResult = 1;
  await EmailRegister.deleteMany({
    registerAccount: mongoose.Types.ObjectId(req.body._id),
  });
  next();
};

/**
 * this function will send a email that user input to implement email verify
 * @param  {express.Request} req this contains the userName to obtain user information
 * @param  {express.Response} res this contain the response from system of email sending result
 */
const sendResetCode = async (req, res) => {
  const user = await userModel.findOne({ userName: req.body.userName });

  if (!user) {
    return res.json({ status: false, msg: "User doesn't exist" });
  }

  const email = user.email[0]; // acquire email address

  const authCode = autoCodeGenerator(6);

  transport.sendMail(
    {
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Reset Your Password",
      html: emailStyle(authCode),
    },
    function (error, data) {
      // assert(error, 500, "fail to send vertify code")
      transport.close();
    },
  );

  try {
    await EmailAuth.deleteMany({ email: email });
    const AuthDocument = new EmailAuth({ email: email, authCode: authCode });
    await AuthDocument.save();
    setTimeout(async () => {
      await EmailAuth.deleteMany({ email: email });
    }, 1000 * 60 * 5);
    return res.json({ status: true, email: email });
  } catch (err) {
    return res.json({ status: false });
  }

  return res.json({ status: false, msg: "Testing Fail" });
};

/**
 * this function will compare the input verify code with database to finish email verify
 * @param  {express.Request} req this contains the email and verify code that user input
 * @param  {express.Response} res this contains the response of system if fail to verify
 */
const userCodeVerify = async (req, res) => {
  try {
    const verify = await EmailAuth.find({
      email: req.body.email,
      authCode: req.body.authCode,
    });
    // console.log(verify);
    if (!verify.length) {
      return res.send({ status: false, msg: "Wrong Code, please try again" });
    }
    await EmailAuth.deleteMany({ email: req.body.email });

    res.send({ status: true });
  } catch (err) {
    res.send({ status: false, msg: "Query Error" });
  }
};

module.exports = {
  emailAuthSend,
  emailCodeVerify,
  emailRegisterCodeSend,
  emailRegisterVerify,
  autoCodeGenerator,
  sendResetCode,
  userCodeVerify,
};
