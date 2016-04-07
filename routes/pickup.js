'use strict';
const express = require('express');
const dbConnection = require('../dbConnect.js')
const googleMapsDMatKey = require('../config.js').googleMapsDMatKey;
const polyline = require('polyline');
const request = require('request');
const spawn = require('child_process').spawn;
const path = require('path');
const router = express.Router();

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

		if (curDate.getDay() == 4)
			subscriptionTypes.push('weekly');
		if (curDate.getDate() == 1)
			subscriptionTypes.push('monthly');
		if (curDate.getMonth() == 7)
			subscriptionTypes.push('twice a year');
		else if (curDate.getMonth() == 1)
			subscriptionTypes.push('annually');

		return db.collection('clients').find(
			{'subscriptionType': {'$in': subscriptionTypes}},
			{'_id': 1, 'address': 1, 'locationPolyEnc': 1}
		).limit(9).toArray();
	})
	.then(function (_clientList) {
		const depoAddress = polyline.encode([[13.077828, 80.261369]]); //Chennai Egmore Railway Platform
		let url = 'https://maps.googleapis.com/maps/api/distancematrix/json?';
		const urlBack = url;
		let urlPlaces = '';
		clientList = _clientList;
		console.log(clientList);
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
					reject(new Error("Google Map API Error"));
					return;
				}
				console.log(distMatrix);
				resolve(distMatrix);
			});
		});
	})
	.then(function (distMatrix) {

		let coords = clientList.map(client => polyline.decode(client.locationPolyEnc)[0].join(' '))
		coords.push("13.077828 80.261369");

		return new Promise(function (resolve, reject) {

			const child = spawn(path.resolve('./a.out'));
			child.stdout.setEncoding('utf8');
			const input = (+coords.length - 1) + ' 5 ' + coords.join(' ');
			let result = '';

			child.on('error', err => {
				reject(err);
			});
			child.stdout.on('data', function (data) {
				result += data;
			});
			child.on('close', function (code) {
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
		const curPickupManUsername = 2;
		let curPickUpManRoute = [];

		for (let i = 0; i < pickupMen.length; ++i) {
			toInsert[pickupMen[i]._id] = routes.routes[i].map(placeIndex => clientList[placeIndex]._id);
			if (pickupMen[i].username == curPickupManUsername)
				curPickUpManRoute = routes.routes[i].map(placeIndex => {
					return {
						'address': clientList[placeIndex].address,
						'coords': polyline.decode(clientList[placeIndex].locationPolyEnc)[0]
					}
				});
		}

		finalRoute = curPickUpManRoute;
		return db.collection('routes').insert({'date': Date.now(), 'routes': toInsert});
	})
	.then(function () {
		return Promise.resolve({'destinations': finalRoute});
	});
}

function getRoute() {

	let db = null;
	let routes = null;

	return dbConnection.reuse()
	.then(function (_db) {

		db = _db;
		const curDate = new Date(Date.now());

		let prevDate = new Date(curDate);
		prevDate.setDate(prevDate.getDate() - 1);
		prevDate.setHours(23);
		prevDate.setMinutes(59);
		prevDate.setSeconds(59);
		prevDate.setMilliseconds(999);
		console.log(prevDate);

		/*let nextDate = new Date(curDate).setDate(curDate.getDate() + 1);
		nextDate.setHours(0);
		nextDate.setMinutes(0);
		nextDate.setSeconds(0);
		nextDate.setMilliseconds(0);*/

		return db.collection('routes').findOne({'date': {'$gt': Date.parse(prevDate)}});
	})
	.then(function (_routes) {
		routes = _routes;
		console.log(routes);
		return db.collection('pickupMen').findOne({'username': 2}, {'_id': 1});
	})
	.then(function (curPickUpMan) {
		const curPickUpManId = curPickUpMan._id;
		let destinations = [];
		if (routes) {
			if (routes.routes[curPickUpManId])
				destinations = routes.routes[curPickUpManId];
			return db.collection('clients').find(
				{'_id': {'$in': destinations}},
				{'address': 1, 'locationPolyEnc': 1}
			).toArray()
			.then(function (clientList) {
				clientList = clientList.map(client => {
					return {
						'address': client.address,
						'coords': polyline.decode(client.locationPolyEnc)[0]
					};
				});
				return Promise.resolve({'destinations': clientList});
			});
		}
		else
			return Promise.resolve(null);
	});
}

router.get('/', function(req, res, next) {
	getRoute()
	.then(function (route) {
		if (route) {
			return Promise.resolve(route);
		}

		return calcRoute(req)
		/*.then(function (distMatrixRaw) {
			//console.log(apiRes.statusCode);
			//if (apiRes.statusCode != 200)
			//	throw(new Error("Google Map API Error"));
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

module.exports = router;