var express = require('express') ;
var app = express() ;
var server = require('http').createServer(app)

_ = require("underscore");


server.listen(3000, '192.168.2.101') ;

var io = require('socket.io').listen(server);

io.disable('log');

app.configure(function(){
  app.use(express.methodOverride());
  app.use(express.bodyParser());
  app.use(express.static(__dirname + '/public'));
  app.use(express.errorHandler({
    dumpExceptions: true, 
    showStack: true
  }));
  app.use(app.router);
});

require('./Pong.js') ;


var pong = new Pong(io) ;


process.on('SIGINT', function() {
	pong.shutdown() ;
	process.exit() ;
}) ;

console.log('express go at 3000') ;