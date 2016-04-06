'use strict';
const express = require('express');
const dbConnection = require('../dbConnect.js')
const googleMapsDMatKey = require('../config.js').googleMapsDMatKey;
const polyline = require('polyline');
const request = require('request');
const spawn = require('child_process').spawn;
const path = require('path');
const router = express.Router();

function getRoute() {

	let db = null;

	return dbConnection.reuse()
	.then(function (_db) {

		db = _db;
		const curDate = new Date(Date.now());
		let subscriptionTypes = [];

		if (curDate.getDay() == 2)
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
	.then(function (clientList) {
		const depoAddress = polyline.encode([[13.077828, 80.261369]]); //Chennai Egmore Railway Platform
		let url = 'https://maps.googleapis.com/maps/api/distancematrix/json?';
		const urlBack = url;
		let urlPlaces = '';
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
				let coords = clientList.map(client => polyline.decode(client.locationPolyEnc)[0].join(' '));
				coords.push("13.077828 80.261369");
				resolve({
					'distMatrix': distMatrix,
					'clientList': coords
				});
			});
		});
	})
	.then(function (routeInfo) {

		const distMatrix = routeInfo.distMatrix;
		const clientList = routeInfo.clientList;
		return new Promise(function (resolve, reject) {

			const child = spawn(path.resolve('./a.out'));
			child.stdout.setEncoding('utf8');
			const input = (+clientList.length - 1) + ' 5 ' + clientList.join(' ');
			let result = '';

			child.on('error', err => {
				reject(err);
			});
			child.stdout.on('data', function (data) {
				result += data;
			});
			child.on('close', function (code) {
				resolve(result);
			});

			child.stdin.write(input + '\n');
		});
	});
}

router.get('/', function(req, res, next) {
	getRoute()
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
	.then(function (result) {
		res.send(result);
	})
	.catch(function (err) {
		console.log(err, err.stack);
		res.sendStatus(500);
	});
});

module.exports = router;