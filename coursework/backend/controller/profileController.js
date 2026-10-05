const mongoose = require("mongoose");
const userModel = mongoose.model("User");
const fs = require("fs");
const passport = require("passport");

require("../config/passport")(passport);

/**
 * set the first Name
 * @param {express.Request} req - first name from client
 * @param {express.Response} res - response from the system.
 */
const editFirstName = async (req, res) => {
  /*{   
        "firstName": "Hongji"
    }*/
  try {
    const editFirstNameFunction = await userModel.findOneAndUpdate(
      { _id: req.user._id },
      { $set: { firstName: req.body.firstName } },
      { upsert: true, new: true }
    );
    res.send("update success");
  } catch (err) {
    res.send("update fail");
    throw err;
  }
};

/**
 * set the last Name
 * @param {express.Request} req - last name from client
 * @param {express.Response} res - response from the system.
 */
const editLastName = async (req, res) => {
  /*{   
        "lastName": "Huang"
    }*/
  try {
    const editLastNameFunction = await userModel.findOneAndUpdate(
      { _id: req.user._id },
      { $set: { lastName: req.body.lastName } },
      { upsert: true, new: true }
    );
    res.send("update success");
  } catch (err) {
    res.send("update fail");
    throw err;
  }
};

/**
 * Set the occupation
 * @param {express.Request} req - occupation from client
 * @param {express.Response} res - response from the system.
 */
const editOccupation = async (req, res) => {
  /*{   
        "occupation": "student"
    }*/
  try {
    const editOccupationFunction = await userModel.findOneAndUpdate(
      { _id: req.user._id },
      { $set: { occupation: req.body.occupation } },
      { upsert: true, new: true }
    );
    res.send("update success");
  } catch (err) {
    res.send("update fail");
    throw err;
  }
};

/**
 * Set the status
 * @param {express.Request} req - status from client
 * @param {express.Response} res - response from the system.
 */
const editStatus = async (req, res) => {
  /*{   
        "status": "Single"
    }*/
  try {
    const editStatusFunction = await userModel.findOneAndUpdate(
      { _id: req.user._id },
      { $set: { status: req.body.status } },
      { upsert: true, new: true }
    );
    res.send("update success");
  } catch (err) {
    res.send("update fail");
    throw err;
  }
};

/**
 * Edit the Profile
 * @param {express.Request} req - status from client
 * @param {express.Response} res - response from the system.
 */
const editProfile = async (req, res) => {
  /*{   
        "firstName": "Hongji",
        "lastName": "Huang",
        "occupation": "student",
        "status": "Single"
    }*/
  try {
    const editProfileFunction = await userModel.findOneAndUpdate(
      { _id: req.user._id },
      {
        $set: {
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          occupation: req.body.occupation,
          status: req.body.status,
          phone: req.body.phone,
          email: req.body.email,
        },
      },
      { upsert: true, new: true }
    );
    const UploadResult = await uploadPhotoOneStep(req, res);
    res.send("update success");
  } catch (err) {
    res.send("update fail");
  }
};

/**
 * Add the phone number
 * @param {express.Request} req - phone number from client
 * @param {express.Response} res - response from the system.
 */
const addPhone = async (req, res) => {
  /*{   
        "phone": "0415467321"
    }*/

  try {
    const updatePhone = await userModel.findOneAndUpdate(
      { _id: req.user._id },
      { $push: { phone: req.body.phone } },
      { upsert: true, new: true }
    );
    res.send("update success");
  } catch (err) {
    res.send("update fail");
    throw err;
  }
};

/**
 * delete the phone number
 * @param {express.Request} req - Username and phone number that want to delete
 * @param {express.Response} res - response from the system.
 */
const delPhone = async (req, res) => {
  /*{   
        "phone": "0415467321"
    }*/
  await userModel.updateOne(
    { _id: req.user._id },
    { $pull: { phone: req.body.phone } },
    function (err) {
      if (err) res.send("delete fail");
      else res.send("delete success");
    }
  );
};

/**
 * Add the email address
 * @param {express.Request} req - Username and email address from client
 * @param {express.Response} res - response from the system.
 */
const addEmail = async (req, res) => {
  /*{   
        "email": "1637520754@qq.com"
    }*/
  try {
    await userModel.findOneAndUpdate(
      { _id: req.user._id },
      { $push: { email: req.body.email } },
      { upsert: true, new: true }
    );
    res.send("update success");
  } catch (err) {
    res.send("update fail");
    throw err;
  }
};

/**
 * delete the email address
 * @param {express.Request} req - Username and email address that want to delete
 * @param {express.Response} res - response from the system.
 */
const delEmail = async (req, res) => {
  /*{   
        "email": "1637520754@qq.com"
    }*/
  await userModel.updateOne(
    { _id: req.user._id },
    { $pull: { email: req.body.email } },
    function (err) {
      if (err) res.send("delete fail");
      else res.send("delete success");
    }
  );
};
/**
 * function that allow user upload their photo and store in database
 * @param  {express.Request} req contain the file information of uploaded file
 * @param  {express.Response} res contain the user information after uploaded
 */
const uploadPhoto = async (req, res) => {
  var img = {
    data: fs.readFileSync(req.file.path),
    contentType: req.file.mimetype,
  };
  try {
    //TODO: replace body._id to user._id
    await userModel.updateOne({ _id: req.user._id }, { portrait: img });
    const user = await userModel.findOne({ _id: req.user._id }).lean();
    console.log("update success");
    res.json({
      status: true,
      image: user.portrait.data.toString("base64"),
      type: user.portrait.contentType,
    });
  } catch (err) {
    res.json({ status: false, message: "upload file failed" });
    console.log(err);
  }
};

/**
 * function that allow user upload their photo and store in database
 * @param  {express.Request} req contain the file information of uploaded file
 * @param  {express.Response} res contain the user information after uploaded
 */
const uploadPhotoOneStep = async (req, res) => {
  try {
    if (!req.file) {
      return { status: false, message: "upload file failed" };
    }
    var img = {
      data: fs.readFileSync(req.file.path),
      contentType: req.file.mimetype,
    };
    //TODO: replace body._id to user._id
    await userModel.updateOne({ _id: req.user._id }, { portrait: img });
    const user = await userModel.findOne({ _id: req.user._id }).lean();
    console.log("update success");
    return {
      status: true,
      image: user.portrait.data.toString("base64"),
      type: user.portrait.contentType,
    };
  } catch (err) {
    console.log(err);
    return { status: false, message: "upload file failed" };
  }
};
//================================function for show the profile======================================//
/**
 * Get the profile data of user
 * @param {express.Request} req
 * @param {express.Response} res - response from the system.
 */
const showProfile = async (req, res) => {
  try {
    res.json({
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      userName: req.user.userName,
      occupation: req.user.occupation,
      status: req.user.status,
      email: req.user.email,
      phone: req.user.phone,
    });
  } catch (err) {
    res.send("show fail");
  }
};

/**
 * Get the profile picture of user
 * @param {express.Request} req contain user object id that need to be display
 * @param {express.Response} res - response from the system.
 */
const displayImage = async (req, res) => {
  try {
    const user = await userModel.findOne({ _id: req.user._id });
    if (user.portrait == undefined) {
      return res.json({ status: false, message: "no image for this user" });
    }
    const decodeImage = user.portrait.data.toString("base64");
    // console.log(data);
    // const image1 = data.toString("base64");
    // console.log(image1);
    return res.json({
      image: decodeImage,
      type: user.portrait.contentType,
      status: true,
    });
  } catch (err) {
    res.json({ status: false });
    console.log(err);
  }
};

module.exports = {
  uploadPhoto,
  editFirstName,
  editLastName,
  editOccupation,
  editStatus,
  addPhone,
  delPhone,
  addEmail,
  delEmail,
  showProfile,
  editProfile,
  displayImage,
};
