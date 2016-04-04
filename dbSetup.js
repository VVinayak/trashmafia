'use strict'
const dbConnect = require("./dbConnect.js");
const polyline = require('polyline');

function insertTestData() {
	let testData = [
		{
			'address': '11, Vasanta Press Rd, Arunachalapuram, Adyar, Chennai, Tamil Nadu 600020, India',
			'coords': [13.010134, 80.261377]
		},
		{
			'address': 'Dr.Radhakrishnan Nagar Main Road, Radhakrishnan Nagar, Adyar, Chennai, Tamil Nadu 600041',
			'coords': [12.992140, 80.258435]
		},
		{
			'address': '3rd Main Rd, Thiruvanmiyur, Chennai, Tamil Nadu 600041',
			'coords': [12.986013, 80.256242]
		},
		{
			'address': '5/639, Old Mahabalipuram Road, Perungudi, Chennai, Tamil Nadu 600096',
			'coords': [12.963205, 80.245806]
		},
		{
			'address': 'No., 63, Anna Salai, Guindy, Chennai, Tamil Nadu 600032',
			'coords': [13.011192, 80.220948]
		},
		{
			'address': '79, Kil mudalaambedu, Panakkam Village, Gumidipoondi taluk, Tiruvallur, Chennai, Tamil Nadu 601206',
			'coords': [13.052366, 80.250951]
		},
		{
			'address': 'No.1, Jawaharlal Nehru Salai ,100 Feet Road, Vadapalani, Chennai, Tamil Nadu 600026',
			'coords': [13.051733, 80.211877]
		},
		{
			'address': 'No.1, Amman Koil Street,Hotel Bheemas, 2nd Floor, Near Murugan Temple, Hotel Bheemas, 100 Feet Rd, Vadapalani, Chennai, Tamil Nadu 600026',
			'coords': [13.052454, 80.214559]
		},
		{
			'address': 'Koyembedu Market E Rd, Virrugambakkam, Koyambedu, Chennai, Tamil Nadu 600107',
			'coords': [13.072195, 80.194929]
		},
		{
			'address': '1831, 18th Main Rd, Anbu Colony, Anna Nagar, Chennai, Tamil Nadu 600040',
			'coords': [13.094984, 80.201388]
		},
		{
			'address': '22/38, Mounasamy Madam Street, Villivakkam, Chennai, Tamil Nadu 600049',
			'coords': [13.108467, 80.210019]
		},
		{
			'address': 'Portugese Rd, Ayanavaram, Chennai, Tamil Nadu 600023',
			'coords': [13.101059, 80.230749]
		},
		{
			'address': '175, Arcot Rd, Valasaravakkam, Chennai, Tamil Nadu 600087',
			'coords': [13.042106, 80.177881]
		},
		{
			'address': 'Janaki Nagar, Valasaravakkam, Chennai, Tamil Nadu 600087',
			'coords': [13.044002, 80.183917]
		},
		{
			'address': 'Mega Mart, Arcot Road, Valasaravakkam, Chennai, Tamil Nadu 600087',
			'coords': [13.044326, 80.186074]
		},
		{
			'address': '4/112, Mount Poonamalle Road, Manapakkam, Chennai, Tamil Nadu 600089',
			'coords': [13.021925, 80.186084]
		}
	];
	let db = null;

	testData = testData.map(function (item, i) {
		let newItem = {};
		newItem['name'] = i + '';
		newItem['username'] = i + '';
		newItem['password'] = i + '';
		newItem['address'] = item.address;
		newItem['locationPolyEnc'] = polyline.encode([item.coords]);
		newItem['subscriptionType'] = 'weekly';
		newItem['phoneNumber'] = i + '';
		newItem['emailId'] = i + '@gmail.com';
		return newItem;
	});

	dbConnect.reuse()
	.then(function (_db) {
		db = _db;
		return db.collection('clients').insertMany(testData);
	})
	.then(function (result) {
		console.log("Inserted 15 sample records.");
	})
	.catch(function (err) {
		console.log(err.stack);
	});
}

insertTestData();