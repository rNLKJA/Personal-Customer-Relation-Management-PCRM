const express = require('express')
const test_router = express.Router()
const test_controller = require('../controller/test_controller')

test_router.get('/', test_controller.send_test_message)

module.exports = test_router