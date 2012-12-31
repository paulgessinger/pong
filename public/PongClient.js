PongClient = function(options) {
	var self = this ;

	this.options = options ;

	this.canvas = new fabric.Canvas(options.canvas) ;
	this.fps = 30 ;
	this.game_started = false ;

	$(window).mousemove(function(event) {	
		self.updateMyRect(event.pageY) ;
	}) ;
	
	this.scores = [
		new fabric.Text('0', {
			fontSize: 100,
			fontFamily:'Arial',
			left: 40,
			top:550,
		}),
		new fabric.Text('0', {
			fontSize: 100,
			left: 960,
			top:550,
			textAlign: 'right',
			fontFamily:'Arial'
		})
	] ;
	
	this.fade = $('#fade') ;
	
	//self.runGame({position: 'right'}) ;
} ;

PongClient.prototype.connect = function() {
	var self = this ;
	
	if(typeof this.socket === 'object') {
		this.socket.socket.reconnect();
	}
	else {
		this.socket = io.connect('http://192.168.2.101:3000') ;
		
		this.socket.on('enter waiting', function(data) {
			self.waitForOpponent(data) ;
		}) ;
	
		this.socket.on('game created', function(data) {
			self.runGame(data) ;
		}) ;
		
		this.socket.on('update ball position', function(data) {
			self.updateBallPosition(data) ;
		}) ;
		
		this.socket.on('update score', function(score) {
			self.scores[0].setText(score[0]+'') ;
			self.scores[1].setText(score[1]+'') ;
		}) ;
	
		this.socket.on('disconnect', function(data) {
			console.log('server disconnected') ;
		
			self.endGame() ;
		}) ;
	}
};

PongClient.prototype.disconnect = function() {
	this.fade.css({display: 'none'}) ;
	this.socket.disconnect() ;
};

PongClient.prototype.endGame = function() {
	this.canvas.clear() ;
	this.game_started = false ;
};

PongClient.prototype.updateBallPosition = function(position) {
	this.ball.set({
		top: position.y,
		left: position.x
	}) ;
};


PongClient.prototype.updateMyRect = function(y) {
	if(this.game_started) {
		
		if((y - this.myRect.getHeight() / 2) <= 0) {
			// we have hit top
			y = this.myRect.getHeight() / 2 ;
		}
		
		if(y + this.myRect.getHeight() / 2 >= this.canvas.getHeight()) {
			// we have hit bottom
			y = this.canvas.getHeight() - this.myRect.getHeight() / 2 ;
		}
		
		this.myRect.set({
			top: y
		})
		
		
		// notify server of position change.
		
		this.socket.emit('update position', {y: y}) ;
	}
};


PongClient.prototype.waitForOpponent = function(data) {
	console.log('waiting for opponent') ;
	
	this.fade.css({display: 'block'}) ;
	
};

PongClient.prototype.runGame = function(data) {
	var self = this ;
	
	this.game_started = true ;
	
	this.fade.css({display: 'none'}) ;
	
	console.log('game created') ;
	
	
	self.scores[0].setText('0') ;
	self.scores[1].setText('0') ;
	
	var myRectOptions = {
		top: 300,
		fill: 'black',
		width: 20,
		height: 100
	}
	
	var theirRectOptions = {
		top: 300,
		fill: 'red',
		width: 20,
		height: 100
	}
	
	if(data.position === 'left') {
		myRectOptions.left = 25 ;
		theirRectOptions.left = 975 ;
	}
	else {
		myRectOptions.left = 975 ;
		theirRectOptions.left = 25 ;
	}
	
	this.myRect = new fabric.Rect(myRectOptions);
	this.theirRect = new fabric.Rect(theirRectOptions);
	
	
	this.ball = new fabric.Circle({
		radius: 10,
		fill: 'blue',
		top:300,
		left:500
	}) ;
	
	this.canvas.add(this.myRect) ;
	this.canvas.add(this.theirRect) ;
	this.canvas.add(this.ball) ;
	
	this.canvas.add(this.scores[0]) ;
	this.canvas.add(this.scores[1]) ;
	
	this.tickInterval = setInterval(function() {
		self.tick() ;
	}, 1000/this.fps) ;
	
	
	this.socket.on('update opponent position', function(position) {
		self.updateOpponentPosition(position) ;
	}) ;
};

PongClient.prototype.updateOpponentPosition = function(position) {
	
	console.log('update opponent position') ;
	
	if(!this.game_started) {
		return false ;
	}
	
	this.theirRect.set({
		top: position.y
	}) ;
};


PongClient.prototype.tick = function() {
	this.canvas.renderAll() ;
};


