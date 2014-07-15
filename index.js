var enabledTransports = ['websocket', 'polling']; // possible options: ['polling', 'websocket', 'flashsocket']

var path = require('path');
var express = require('express');
var app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.all('/engine.io', function(req, res, next) {
	server.handleRequest(req, res);
});

var httpServer = require('http').createServer(app).listen(3000);

httpServer.on('upgrade', function (req, socket, head) {
	server.handleUpgrade(req, socket, head);
});

var engine = require('engine.io');
var server = new engine.Server({ transports: enabledTransports });

var clientsData = {};

console.log('Server started. Now point your browser to http://localhost:3000/');

server.on('connection', function (client) {
	console.log('new client connected : ' + client.id);

	clientsData[client.id] = { id: client.id };

	publishToAll(client, {
		command: 'new.client.connected',
		data: {
			id: client.id
		}
	});

	sendData(client, {
		command: 'current.connected.clients',
		data: {
			clients: clientsData
		}
	});

	client.on('message', function (message) {
		message = JSON.parse(message);

		if (message.command && message.data && typeof handlers[message.command] === 'function') {
			handlers[message.command](client, message.data);
		}

	});

	client.on('close', function () {

		publishToAll(client, {
			command: 'client.disconnected',
			data: {
				id: client.id
			}
		});

		delete clientsData[client.id];

	});
});

var sendData = function(toClient, message) {
	toClient.send(JSON.stringify(message));
};

var publishToAll = function(byClient, message) {
	message.data._sentBy = byClient.id;
	for (var clientId in server.clients) {
		if (server.clients.hasOwnProperty(clientId)) {
			server.clients[clientId].send(JSON.stringify(message));
		}
	}
};

var handlers = {
	'update.name': function(client, data) {
		if (!data.name) return false;

		clientsData[client.id].name = data.name;

		publishToAll(client, {
			command: 'client.name.updated',
			data: {
				id: client.id,
				name: data.name
			}
		});
	},
	'some.custom.handler': function(client, data) {
		// do some custom stuff
	}
};