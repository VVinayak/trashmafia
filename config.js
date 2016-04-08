const database = {
	'username': '',
	'password': '',
	'host': 'localhost',
	'port': '27017',
	'db_name': 'trashmafia'
};

const googleMapsDMatKey = 'AIzaSyBhGZAQoLq15gOURHWOwq81OSf_nljUZcI';

const clientSubscriptionData = {
	'weekly': 5,
	'monthly': 1,
	'twiceAYear': [1, 7],
	'annually': 1
}

const depoCoords = [13.077828, 80.261369]; //Chennai Egmore Railway Platform

module.exports.database = database;
module.exports.googleMapsDMatKey = googleMapsDMatKey;
module.exports.clientSubscriptionData = clientSubscriptionData;
module.exports.depoCoords = depoCoords;