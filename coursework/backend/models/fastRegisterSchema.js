// mongodb schema
const mongoose = require('mongoose');

// create mongoose schema
const emailRegisterSchema = new mongoose.Schema({
    fastRegisterCode: {type: String, required: true},
    registerAccount: {type: mongoose.Schema.Types.ObjectId, ref:"User", required: true}
})

const EmailRegister = mongoose.model('EmailRegister', emailRegisterSchema)

module.exports = EmailRegister