const mongoose = require('mongoose') // connect to the database
const path = require('path') // obtain the absolute path

// fetch test results
const Test = mongoose.model('TEST')

const send_test_message = async (req, res) => {
	try {
		const test_message = await Test.findOne({'test': 'This is a test message! If you can see this, it means you are successfully connect to the database!!!'}).lean()
		res.send(`<h1 style="color:red">${test_message['test']}</h1>`)
	} catch (err) {
		res.status(400)
		throw(err)
	}
}

module.exports = {
	send_test_message,
}