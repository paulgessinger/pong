Pong = function(io) {
	var self = this ;
	
	this.io = io ;
	

	this.waiting = false ;
	this.games = [] ;

	this.velocity_amount = 4 ;
	
	this.ball_radius = 10 ;
	this.rect = {
		width: 20,
		height: 100
	}
	
	this.tickInterval = 10 ;

	io.on('connection', function(socket) {
		self.connectClient(socket) ;
	}) ; 
} ;

Pong.prototype.connectClient = function(socket) {
	var self = this ;

	this.matchClient(socket) ;
	
	
	// attach disconnect listener
	socket.on('disconnect', function() {
		self.disconnectClient(socket) ;
	}) ;
	socket.on('leave', function() {
		self.disconnectClient(socket) ;
	}) ;
};

Pong.prototype.matchClient = function(socket) {
	var self = this ;
	
	if(typeof this.waiting !== 'object') {
		// no other client is waiting, enter waiting mode.
		this.waiting = socket ;
		socket.emit('enter waiting') ;
		
		console.log('move client to waiting') ;
	}
	else {
		// another client is already waiting, pair them up
		
		this.createGame(socket, this.waiting) ;
		
		this.waiting = false ;
	}
	
};

Pong.prototype.getInitialAngle = function() {
	return ((Math.PI*0.6 * Math.random()) - Math.PI*0.3) + (Math.round(Math.random()) * Math.PI) ;
};


Pong.prototype.createGame = function(left, right) {
	var self = this ;
	
	var initial_angle = this.getInitialAngle() ;
	
	var GameObj = function() {
		this.name = 'game' + (self.games.length + 1) ;
		this.clients = [
			{
				socket: left,
				score: 0,
			},
			{
				socket: right,
				score: 0
			}
		] ;
		
		this.ball = {
			position: {
				x: 500,
				y: 300
			},
			velocity: {
				x: Math.floor(self.velocity_amount * Math.cos(initial_angle)),
				y: Math.floor(self.velocity_amount * Math.sin(initial_angle))
			}
		} ;
	} ;
	
	var game = new GameObj() ;
		
	game.io = this.io.sockets.in(game.name) ;
		
	game.clients[0].socket.join(game.name) ;
	game.clients[1].socket.join(game.name) ;
		
	game.clients[0].position = {
		x: 25,
		y: 300
	} ;
		
	game.clients[1].position = {
		x: 975,
		y: 300
	} ;
	
	
	game.clients[0].socket.set('game', game.name, function() {}) ;
	game.clients[1].socket.set('game', game.name, function() {}) ;	
		
	game.clients[0].socket.emit('game created', {position: 'left'}) ;
	game.clients[1].socket.emit('game created', {position: 'right'}) ;
		
	game.clients[0].socket.on('update position', function(data) {
		self.updatePosition(game, 0, data.y) ;
	}) ;
		
	game.clients[1].socket.on('update position', function(data) {
		self.updatePosition(game, 1, data.y) ;
	}) ;
		
		
	game.interval = setInterval(function() {
		self.tick(game) ;
	}, self.tickInterval) ;
		
	this.games.push(game) ;
		
	console.log('game ' + game.name + ' created') ;
	
};

Pong.prototype.tick = function(game) {
	// update position of ball server side
	var new_position = {
		x: game.ball.position.x + game.ball.velocity.x,
		y: game.ball.position.y + game.ball.velocity.y
	} ;
	
	// collision detection
	
	new_position = this.checkBallCollisionWithRect(new_position, game, 0) ;
	new_position = this.checkBallCollisionWithRect(new_position, game, 1) ;
	
	new_position = this.checkBallCollisionWithWalls(new_position, game) ;
	
	
	game.ball.position = new_position ;
	
	// emit changes.
	this.io.sockets.in(game.name).emit('update ball position', game.ball.position) ;
} ;

Pong.prototype.checkBallCollisionWithRect = function(new_position, game, index) {
	var self = this ;
	
	var client = game.clients[index] ;
	var ball = game.ball ;
	
	var circle = {
		r: self.ball_radius,
		x: ball.position.x,
		y: ball.position.y
	} ;
	
	var rect = self.rect ;
	
	rect.x = client.position.x ;
	rect.y = client.position.y ;
	
	
	if(self.intersectsRectCircle(rect, circle)) {
		ball.velocity.x = -1 * ball.velocity.x ;
		
		var y_factor = (circle.y - rect.y) / (self.rect.height / 2)
		ball.velocity.y = ball.velocity.y + Math.floor(y_factor * self.velocity_amount) ;
		
		new_position.y = ball.position.y + ball.velocity.y ;
		
		if(index === 0) {
			new_position.x = 36 + self.ball_radius;
		}
		
		if(index === 1) {
			new_position.x = 1000 - (36 + self.ball_radius) ;
		}
	}
	
	return new_position ;
};

Pong.prototype.intersectsRectCircle = function(rect, circle) {
	
	var circleDistance = {} ;
	
	circleDistance.x = Math.abs(circle.x - rect.x);
	circleDistance.y = Math.abs(circle.y - rect.y);

	if (circleDistance.x > (rect.width/2 + circle.r)) { return false; }
	if (circleDistance.y > (rect.height/2 + circle.r)) { return false; }

	if (circleDistance.x <= (rect.width/2)) { return true; } 
	if (circleDistance.y <= (rect.height/2)) { return true; }

	cornerDistance_sq = (circleDistance.x - rect.width/2) * (circleDistance.x - rect.width/2) + (circleDistance.y - rect.height/2) * (circleDistance.y - rect.height/2);

	return (cornerDistance_sq <= (circle.r * circle.r) ) ;
	
} ;


Pong.prototype.checkBallCollisionWithWalls = function(new_position, game) {
	
	var ball = game.ball ;
	
	// top
	if(new_position.y - this.ball_radius < 0) {
		ball.velocity.y = -1 * ball.velocity.y
	}
	
	// left
	if(new_position.x - this.ball_radius < 0) {
		
		var initial_angle = this.getInitialAngle() ;
		
		game.clients[1].score++ ;
		
		this.updateScore(game) ;
		
		new_position = {
			x: 500,
			y: 300
		} ;
		
		ball.velocity = {
			x: Math.floor(this.velocity_amount * Math.cos(initial_angle)),
			y: Math.floor(this.velocity_amount * Math.sin(initial_angle))
		} ;
		
	}
	
	// bottom
	if(new_position.y + this.ball_radius > 600) {
		ball.velocity.y = -1 * ball.velocity.y
	}
	
	// right
	if(new_position.x + this.ball_radius > 1000) {
		
		var initial_angle = this.getInitialAngle() ;
		
		game.clients[0].score++ ;
		
		this.updateScore(game) ;
		
		new_position = {
			x: 500,
			y: 300
		} ;
		
		ball.velocity = {
			x: Math.floor(this.velocity_amount * Math.cos(initial_angle)),
			y: Math.floor(this.velocity_amount * Math.sin(initial_angle))
		} ;
		
	}
	
	return new_position ;
	
};

Pong.prototype.updateScore = function(game) {
	game.io.emit('update score', [game.clients[0].score, game.clients[1].score]) ;
};


Pong.prototype.updatePosition = function(game, index, y) {
	var self = this ;
	
	var client = game.clients[index] ;
	
	client.position.y = y ;
		
	game.clients[1-index].socket.emit('update opponent position', {y: y}) ;
		
	//client.socket.broadcast.in(game).emit('update opponent position', {y: y}) ; 

};


Pong.prototype.disconnectClient = function(socket) {
	var self = this ;
	
	if(typeof this.waiting === 'object') {
		
		if(this.waiting.id === socket.id) {
			this.waiting = false ;
			console.log('client left waiting') ;
			
			return;
		}
	}
	
	socket.get('game', function(err, client_game) {
		
		for(var i=0;i<self.games.length;i++) {
			
			if(typeof self.games[i] === 'undefined') {
				continue;
			}
			
			var game = self.games[i] ;
			
			if(client_game === game.name) {
				console.log('end game of disconnected client') ;
				
				_.each(game.clients, function(client) {
					if(client.socket.id !== socket.id) {
						client.socket.emit('disconnect') ;
						self.matchClient(client.socket) ;
					}
					
					client.socket.leave(game.name) ;
				}) ;
				
				clearInterval(game.interval) ;
				
				delete self.games[i] ;
				
				break;
			}
		} ;
		
	}) ;
	// TODO END ALL GAMES CLIENT IS IN.
};

Pong.prototype.shutdown = function() {
	var self = this ;
	console.log('shutdown pong') ;
	
	this.io.emit('disconnect') ;
};

Pong.prototype.clearGame = function(game) {

	console.log('clear that motherfucker') ;

};

