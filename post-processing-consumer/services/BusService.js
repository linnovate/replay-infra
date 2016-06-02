var BusMQ = require('busmq');

var bus;

module.exports = function(){
	// initialize internal bus object
	bus = createBus();

	// exports
	this.consume = consume;
}

function createBus(){
	// detect redis host & port
	var REDIS_HOST = process.env.REDIS_HOST || 'localhost';
	var REDIS_PORT = process.env.REDIS_PORT || 6379;
	var REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
	console.log('Redis host: ', REDIS_HOST);
	console.log('Redis port: ', REDIS_PORT);
	console.log('Redis password: ', REDIS_PASSWORD);

	// append '@' if passowrd supplied
	REDIS_PASSWORD = REDIS_PASSWORD ? REDIS_PASSWORD + '@' : REDIS_PASSWORD;

	var redisUrl = 'redis://' + REDIS_PASSWORD + REDIS_HOST + ':' + REDIS_PORT;
	bus = BusMQ.create({redis: [redisUrl]});
	console.log('Bus was successfuly created.');
	return bus;
}

// connecting to bus, attaching to appropriate queue and perform 
// user callback upon incoming messages
function consume(queueName, callback){
	bus.on('online', function() {
	  var q = bus.queue(queueName);
	  q.on('attached', function() {
	    console.log('Attached consumer to queue ' + queueName + '.');
	  });
	  q.on('message', function(message, id) {
	  	// call the callback, and when it finishes, detach from queue
	  	callback(message);
	  });
	  q.attach();
	  // the 'message' event will be fired when a message is retrieved
	  q.consume(); 
	});

	// connect the redis instances
	bus.connect();
}

// used because some of the consumers are also the producers of another jobs
// connecting to the bus, attaching to a queue and pushing a job
function produce(queueName, job){
	bus.on('online', function() {
	  var q = bus.queue(queueName);
	  q.on('attached', function() {
	    console.log('Attached producer to queue ' + queueName + '.');
	  });
	  q.attach();
	  q.push(job);
	});
	bus.connect();
}