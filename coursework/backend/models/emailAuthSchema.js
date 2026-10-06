// mongodb schema
const mongoose = require('mongoose');

// create mongoose schema
const emailAuthSchema = new mongoose.Schema({
    // Name of meeting person
    email: {type: String, required: true},
    authCode: {type: String, required: true}
})

const EmailAuth = mongoose.model('EmailAuth', emailAuthSchema)

module.exports = EmailAuth