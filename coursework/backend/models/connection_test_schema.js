// mongodb schema
const mongoose = require('mongoose')

const testSchema = new mongoose.Schema({
	test: String
})

const TEST = mongoose.model('TEST', testSchema)

module.exports = TEST