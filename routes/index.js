var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	req.session['username'] = 2;
	req.session.save();
	res.redirect("/pickup");
});

module.exports = router;
