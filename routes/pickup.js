'use strict';
const express = require('express');
const dbConnection = require('../dbConnect.js')
const googleMapsDMatKey = require('../config.js').googleMapsDMatKey;
const polyline = require('polyline');
const request = require('request');
const spawn = require('child_process').spawn;
const path = require('path');
const mongodb = require('mongodb');
const router = express.Router();

function getPrevDate() {

	const curDate = new Date(Date.now());

	let prevDate = new Date(curDate);
	prevDate.setDate(prevDate.getDate() - 1);
	prevDate.setHours(23);
	prevDate.setMinutes(59);
	prevDate.setSeconds(59);
	prevDate.setMilliseconds(999);

	return prevDate;	
}

function calcRoute(req) {

	let db = null;
	let clientList = [];
	let routes = null;
	let pickupMen = [];
	let finalRoute = [];

	return dbConnection.reuse()
	.then(function (_db) {

		db = _db;
		const curDate = new Date(Date.now());
		let subscriptionTypes = [];

		if (curDate.getDay() == 5)
			subscriptionTypes.push('weekly');
		if (curDate.getDate() == 1)
			subscriptionTypes.push('monthly');
		if (curDate.getMonth() == 7)
			subscriptionTypes.push('twice a year');
		else if (curDate.getMonth() == 1) {
			subscriptionTypes.push('twice a year');
			subscriptionTypes.push('annually');
		}

		return db.collection('clients').find(
			{'subscriptionType': {'$in': subscriptionTypes}},
			{'_id': 1, 'address': 1, 'locationPolyEnc': 1}
		).toArray();
	})
	.then(function (_clientList) {
		const depoAddress = polyline.encode([[13.077828, 80.261369]]); //Chennai Egmore Railway Platform
		let url = 'https://maps.googleapis.com/maps/api/distancematrix/json?';
		const urlBack = url;
		let urlPlaces = '';
		clientList = _clientList || [];
		console.log("clientList", clientList);
		for (const client of clientList) {
			urlPlaces += client.locationPolyEnc;
		}
		urlPlaces += depoAddress;
		//console.log(urlPlaces);
		url += 'origins=enc:' + urlPlaces + ':&destinations=enc:' + urlPlaces + ':&key' + googleMapsDMatKey;
		//console.log(url);
		//return request(url);
		return new Promise(function (resolve, reject) {
			request(urlBack, function (err, res, distMatrix) {
				if (err) {
					reject(err);
					return;
				}
				if (res.statusCode!= 200) {
					reject(new Error('Google Map API Error'));
					return;
				}
				console.log(distMatrix);
				resolve(distMatrix);
			});
		});
	})
	.then(function (distMatrix) {

		let coords = clientList.map(client => polyline.decode(client.locationPolyEnc)[0].join(' '))
		coords.push('13.077828 80.261369');

		return new Promise(function (resolve, reject) {

			const child = spawn(path.resolve('./a.out'));
			child.stdout.setEncoding('utf8');
			const input = (+coords.length - 1) + ' 5 ' + coords.join(' ');
			let result = '';

			child.on('error', err => {
				console.log("C++ error");
				reject(err);
			});
			child.stdout.on('data', function (data) {
				result += data;
			});
			child.on('close', function (code) {
				console.log(result);
				resolve(JSON.parse(result));
			});

			child.stdin.write(input + '\n');
		});
	})
	.then(function (_routes) {
		routes = _routes;
		return db.collection('pickupMen').find(
			{},
			{'_id': 1, 'lastTraveled': 1, 'username': 1}
		).sort({'lastTraveled': 1}).limit(routes.routes.length).toArray();
	})
	.then(function (_pickupMen) {
		const curDate = Date.now();
		pickupMen = _pickupMen;

		return db.collection('pickupMen').updateMany(
			{'_id': {'$in': pickupMen.map(man => man._id)}},
			{'$set': {'lastTraveled': curDate}}
		);
	})
	.then(function () {
		let toInsert = {};
		const curPickupManUsername = req.session['username'];
		let curPickUpManRoute = [];

		if (routes.routes.length > 0) {
			for (let i = 0; i < pickupMen.length; ++i) {
				toInsert[pickupMen[i]._id] = routes.routes[i].map(placeIndex => {
					return {
						'id': clientList[placeIndex]._id,
						'visitedAt': -1
					};
				});
				if (pickupMen[i].username == curPickupManUsername)
					curPickUpManRoute = routes.routes[i].map(placeIndex => {
						return {
							'id': clientList[placeIndex]._id,
							'address': clientList[placeIndex].address,
							'coords': polyline.decode(clientList[placeIndex].locationPolyEnc)[0],
							'status': 'not visited'
						};
					});
			}
		}
		else {
			toInsert = {};
			curPickUpManRoute = [];
		}

		finalRoute = curPickUpManRoute;
		return db.collection('routes').insertOne({'date': Date.now(), 'routes': toInsert});
	})
	.then(function () {
		return Promise.resolve({'destinations': finalRoute});
	});
}

function getRoute(req) {

	let db = null;
	let routes = null;

	return dbConnection.reuse()
	.then(function (_db) {

		db = _db;
		
		const prevDate = getPrevDate();
		console.log("Previous Date", prevDate);

		return db.collection('routes').findOne({'date': {'$gt': Date.parse(prevDate)}});
	})
	.then(function (_routes) {
		routes = _routes;
		console.log("Routes", routes);
		return db.collection('pickupMen').findOne({'username': req.session['username']}, {'_id': 1});
	})
	.then(function (curPickUpMan) {
		const curPickUpManId = curPickUpMan._id;
		let destinations = [];
		if (routes) {
			if (routes.routes[curPickUpManId]) {
				destinations = routes.routes[curPickUpManId].map(client => client.id);
				return db.collection('clients').find(
					{'_id': {'$in': destinations}},
					{'_id': 1, 'address': 1, 'locationPolyEnc': 1}
				).toArray()
				.then(function (clientList) {
					let clientMap = {};
					for (const client of clientList) {
						clientMap[client._id] = client;
					}
					const finalRoute = routes.routes[curPickUpManId].map(client => {
						const id = client.id;
						return {
							'id': id,
							'address': clientMap[id].address,
							'coords': polyline.decode(clientMap[id].locationPolyEnc)[0],
							'status': (client.visitedAt == -1) ? 'not visited': 'visited'
						};

					});
					return Promise.resolve({'destinations': finalRoute});
				});
			}
			else
				return Promise.resolve({'destinations': []});
		}
		else
			return Promise.resolve(null);
	});
}

function updatePickup(req) {

	let db = null;
	let routes = null;

	return dbConnection.reuse()
	.then(function (_db) {
		db = _db;
		const prevDate = getPrevDate();

		return db.collection('routes').findOne({'date': {'$gt': Date.parse(prevDate)}});
	})
	.then(function (_routes) {
		routes = _routes;
		if (routes) {
			return db.collection('pickupMen').findOne({'username': req.session['username']}, {'_id': 1})
			.then(function (curPickupMan) {
				const curPickUpManId = curPickupMan._id;
				if (routes.routes[curPickUpManId]) {
					let destinations = routes.routes[curPickUpManId];
					for (let i = 0; i < destinations.length; ++i) {
						if (destinations[i].id == req.body.id) {
							destinations[i].visitedAt = Date.now();
							break;
						}
					}
					let update = {'$set': {}};
					const fieldToUpdate = 'routes.' + curPickUpManId;
					update['$set'][fieldToUpdate] = destinations
					return db.collection('routes').updateOne(
						{'_id': routes._id},
						update
					)
					.then(function () {
						return Promise.resolve({'message': 'success'});
					});
				}
				else return Promise.resolve({'message': 'success'});
			});
		}
		else return Promise.resolve({'message': 'not calculated routes'});
	})
}

router.all('/*', function (req, res, next) {
	if (!req.session || !req.session['username']) {
		res.json({
			'status': 'error',
			'message': 'Unauthorized access - not logged in'
		});
	}
	else {
		return next();
	}
});

router.get('/', function(req, res, next) {
	getRoute(req)
	.then(function (route) {
		if (route) {
			return Promise.resolve(route);
		}

		return calcRoute(req)
		/*.then(function (distMatrixRaw) {
			//console.log(apiRes.statusCode);
			//if (apiRes.statusCode != 200)
			//	throw(new Error('Google Map API Error'));
			distMatrix = JSON.parse(distMatrixRaw);
			console.log(distMatrix);
			for (const row of distMatrix.rows) {
				for (const place of row.elements) {
					console.log(place.duration.value);
				}
				console.log('\n');
			}
			res.json(distMatrix);
			console.log(distMatrixRaw);
			//res.send(distMatrixRaw);
			res.json(JSON.parse(distMatrixRaw));
		})*/
	})
	.then(function (result) {
		res.json(result);
	})
	.catch(function (err) {
		console.log(err, err.stack);
		res.sendStatus(500);
	});
});

router.post('/updatepickup', function (req, res, next) {
	updatePickup(req)
	.then(function (message) {
		res.json(message);
	})
	.catch(function (err) {
		console.log(err, err.stack);
		res.sendStatus(500);
	});
});

module.exports = router;