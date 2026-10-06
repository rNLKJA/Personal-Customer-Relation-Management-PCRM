const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const destinationFolder = "./uploadedImage/";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, destinationFolder);
  },
  filename: (req, file, cb) => {
    // body.targetId demenstrate which user/contact this image
    const fileName = req.user._id + "-" + file.originalname;
    cb(null, fileName);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log(file.mimetype);
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
    }
  },
});

module.exports = {
  upload,
};
