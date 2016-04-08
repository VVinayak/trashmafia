'use strict';
const express = require('express');
const dbConnection = require('../dbConnect.js');
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	req.session['username'] = 2;
	req.session.save();
	res.redirect('/pickup');
});

router.post('/login', function (req, res, next) {
	let db = null;

	dbConnection.reuse()
	.then(function (_db) {
		db = _db;
		return db.collection('pickupMen').findOne(req.body, {'username': 1});
	})
	.then(function (curPickupMan) {
		req.session['username'] = curPickupMan.username;
		req.session.save();
		res.redirect('/pickup');
	})
	.catch(function (err) {
		console.log(err, err.stack);
		res.sendStatus(500);
	});
});

router.post('/register', function (req, res, next) {

	let db = null;

	dbConnection.reuse()
	.then(function (_db) {
		db = _db;
		return db.collection('clients').insert(req.body);
	})
	.then(function (result) {
		res.redirect('/');
	})
	.catch(function (err) {
		console.log(err, err.stack);
		res.sendStatus(500);
	});
});

router.post('/logout', function (req, res, next) {
	req.session.destroy();
	req.session.save();
	res.redirect('/');
});

module.exports = router;
