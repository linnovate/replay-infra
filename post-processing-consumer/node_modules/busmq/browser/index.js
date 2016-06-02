var events = require('events');
var util = require('util');
var bus = require('../lib/bus');

function BusClient(url, secret) {
  events.EventEmitter.call(this);
  this.url = url;
  this.bus = bus.create({
    federate: {
      poolSize: 1,
      urls: [url],
      secret: secret
    }
  });
}

util.inherits(BusClient, events.EventEmitter);

BusClient.prototype._federateObject = function(object, cb) {
  var fed = this.bus.federate(object, this.url);
  fed.on('ready', function(o) {
    o.fed = fed;
    cb(null, o);
  });
  fed.on('error', cb);
};

BusClient.prototype.queue = function(name, cb) {
  this._federateObject(this.bus.queue(name), cb);
};

BusClient.prototype.channel = function(name, local, remote, cb) {
  this._federateObject(this.bus.channel(name, local, remote), cb);
};

BusClient.prototype.pubsub = function(name, cb) {
  this._federateObject(this.bus.pubsub(name), cb);
};

BusClient.prototype.persistify = function(name, object, attributes, cb) {
  this._federateObject(this.bus.persistify(name, object, attributes), cb);
};

exports = module.exports = function(url, secret) {
  return new BusClient(url, secret);
};
