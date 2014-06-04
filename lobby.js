var express = require('express'),
	WebSocketServer = require('ws').Server;

var app = express(),
	http = require('http').createServer(app),
	wsschat = new WebSocketServer({server:http, path:'/chat'}),
	wsspeer = new WebSocketServer({server:http, path:'/peer'});

var names = {},
	peers = {};

app.use('/', express.static(__dirname + '/public'));
app.use(function(req, res, next) {
	//to access rawBody http://stackoverflow.com/questions/9920208/expressjs-raw-body
    var data = '';
    req.setEncoding('utf8');
    req.on('data', function(chunk) { 
        data += chunk;
    });
    req.on('end', function() {
        req.rawBody = data;
        next();
    });
});

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/public/lobby.html');
});
app.post('/login', function(request, res) {
	var name = request.rawBody;
	console.log(name);
	if( !names[name]) {
		names[name] = 1;
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.write('success');
		res.end();
	}
	else {
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.write('fail');
		res.end();
	}
});

wsschat.on('connection', function(ws) {
	var name;
	ws.on('message', function(data) {
		data = JSON.parse(data);
		if( data.mess && data.mess==='logged in.') {
			name = data.name;
			names[name] = ws;
			console.log('Client '+name+' connected.');
		}
		if( data.target==='all') {
			for( var I in names)
				names[I].send(JSON.stringify(data));
		} else {
			names[data.target].send(JSON.stringify(data));
		}
    });
	ws.on('close', function() {
		console.log('Client '+name+' disconnected');
		delete names[name];
	});
});

wsspeer.on('connection', function(ws) {
	var name;
	console.log('Client connected.');
	ws.on('message', function(data) {
		data = JSON.parse(data);
		if( data.open) {
			if( !peers[data.name]) {
				name = data.name;
				peers[data.name] = ws;
				console.log('Client '+name+' connected.');
			}
		}
		if( data.target && peers[data.target]) {
			peers[data.target].send(JSON.stringify(data));
		}
	});

	ws.on('close', function() {
		console.log('Client '+name+' disconnected');
		delete peers[name];
	});
});

setInterval(function()
{
	for( var I in names)
		names[I].send(JSON.stringify({}));
},1000*45); //every 45 sec; because heroku timeouts in 55 sec

http.listen(Number(process.env.PORT || 8080));