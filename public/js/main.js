$(function() {

	var appName = 'My Engine.IO based app';

	document.title = appName;

	var globalLoadingElement = $('<div>')
		.addClass('global-loader')
		.appendTo('body')
		.activity();

	var appContainer = $('<div>')
		.addClass('app-container')
		.html('Your app will be here. <small>To get started, open this URL in another browser tab.</small>')
		.appendTo('body');

	var client = (function() {
		var connected = false;
		var selfId = false;
		
		var reconnectTimeout = 1 * 1000; // 1 sec
		var reconnectingInterval = false;

		var socket = false;
		
		var connect = function() {
			if (connected) return false;
			
			socket = new eio.Socket({ host: document.location.hostname, port: document.location.port });
			
			socket.onopen = function () {
				connected = true;
				selfId = socket.id;

				if (reconnectingInterval) clearInterval(reconnectingInterval);
				
				socket.on('message', function (message) {
					console.log(message);
					try {
						message = JSON.parse(message);
					}
					catch(err) {
						console.log(err);
						throw err;
					}
					
					if (message.command && message.data && typeof handlers[message.command] === 'function') {
						handlers[message.command](message.data);
					}
 					
				});
				
				socket.on('close', function () {
					connected = false;
					reconnectingInterval = setInterval(connect, reconnectTimeout);

					onDisconnect();
				});
				
				onConnect();
				
			};
		};
		
		connect();
		
		return {
			send: function(command, data) {
				if (connected) {
					socket.send(JSON.stringify({ command: command, data: data }));
				}
				else {
					alert('not connected');
				}
			},
			isConnected: function() {
				return connected;
			},
			selfId: function() {
				return selfId;
			}
		}
	})();
	
	var connectedClientsElements = {};
	
	var clientsData = {};
	
	var connectedClientsContainer = $('<div>')
		.addClass('connected-clients')
		.appendTo('body');

	var connectedClientsContainerHeader = $('<h1>')
		.text('Connected users');

	var connectedUsersCounter = $('<span>')
		.addClass('connected-users-counter')
		.appendTo(connectedClientsContainerHeader)
		.text(0);
	
	var updateClientsCount = function() {
		var count = 0;
		for (var key in clientsData) {
			if (clientsData.hasOwnProperty(key)) count++;
		}
		connectedUsersCounter.text(count);
	};

	var onConnect = function() {
		// do smth when connected
		globalLoadingElement.detach();
		connectedClientsContainerHeader.appendTo(connectedClientsContainer);
	};

	var onDisconnect = function() {
		// do smth when disconnected
		globalLoadingElement.appendTo('body');
		clientsData = {};
		connectedClientsContainer.empty();
		connectedClientsElements = {};
	};
	
	var constructClientNameElement = function(data) {
		if (!connectedClientsElements[data.id]) {
			connectedClientsElements[data.id] = $('<div>')
				.appendTo(connectedClientsContainer)
				.text((!data.name ? data.id : data.name) + (data.id == client.selfId() ? ' (you)' : ''))
				.addClass('client-name' + (data.id == client.selfId() ? ' you' : ''));
		}
		else {
			connectedClientsElements[data.id]
				.text((!data.name ? data.id : data.name) + (data.id == client.selfId() ? ' (you)' : ''))
				.addClass('client-name' + (data.id == client.selfId() ? ' you' : ''));
		}
	};

	var handlers = {
		'new.client.connected': function(data) {
			clientsData[data.id] = data;
			constructClientNameElement(data);
			updateClientsCount();
		},
		'client.disconnected': function(data) {
			delete clientsData[data.id];
			
			if (connectedClientsElements[data.id]) {
				connectedClientsElements[data.id].remove();
				delete connectedClientsElements[data.id];
			}
			updateClientsCount();
		},
		'current.connected.clients': function(data) {
			for (var key in data.clients) {
				if (data.clients.hasOwnProperty(key) && !connectedClientsElements[data.clients[key].id]) {
					
					clientsData[data.clients[key].id] = data.clients[key];
					constructClientNameElement(data.clients[key]);

				}
			}
			updateClientsCount();
		},
		'client.name.updated': function(data) {
			if (!clientsData[data.id]) return false;
			clientsData[data.id].name = data.name;
			
			if (connectedClientsElements[data.id]) {
				constructClientNameElement(data);
			}
		}
	};
	
	var header = $('<div>')
		.addClass('header')
		.appendTo('body');

	var appTitleElement = $('<h1>')
		.text(appName)
		.appendTo(header);
	
	var nameForm = $('<div>')
		.appendTo('body')
		.addClass('name-form');
	
	var updateNameHandler = function(e) {
		client.send('update.name', { name: nameInput.val() });
	};

	var nameUpdateTimeout = false;
		
	var nameInput = $('<input type="text" placeholder="Enter Your Name">')
		.appendTo(nameForm)
		.on('keyup', function(e) {
			if (nameUpdateTimeout) clearTimeout(nameUpdateTimeout);
			if (nameInput.val() != '') nameUpdateTimeout = setTimeout(updateNameHandler, 300);
		});
		
	
});