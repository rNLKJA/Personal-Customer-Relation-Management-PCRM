const express = require('express');

const recordRouter = express.Router()

const expressValidator = require('express-validator')

const recordController = require('../controller/recordController.js')
const passport = require('passport');
require('../config/passport')(passport);

recordRouter.get('/')

recordRouter.post('/createRecord', passport.authenticate('jwt', { session: false }), (req,res) => recordController.createRecord(req, res))
recordRouter.get('/showRecord', passport.authenticate('jwt', { session: false }), (req,res) => recordController.showAllRecords(req,res))
recordRouter.get('/searchRecord', passport.authenticate('jwt', { session: false }), (req,res) => recordController.searchRecord(req,res))
recordRouter.post('/deleteOneRecord', passport.authenticate('jwt', { session: false }), (req,res) => recordController.deleteOneRecord(req, res))
recordRouter.post('/editRecord', passport.authenticate('jwt', { session: false }), (req,res) => recordController.editRecord(req, res))
module.exports = recordRouter