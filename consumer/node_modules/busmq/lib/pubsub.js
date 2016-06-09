var events = require('events');
var util = require('util');

/**
 * Pubsub. Do not instantiate directly, instead use {Bus#pubsub} to create a new Pubsub.
 * @param bus
 * @param name
 * @constructor
 */
function Pubsub(bus, name) {
  events.EventEmitter.call(this);
  this.bus = bus;
  this.type = 'pubsub';
  this.id = "bus:pubsub:" + name;
  this.logger = bus.logger.withTag(this.id);
  this.name = name;
}

util.inherits(Pubsub, events.EventEmitter);

/**
 * Setup association to the connection
 * @private
 */
Pubsub.prototype._connect = function() {
  if (this.connection) {
    return this.connection;
  }

  // always use the first connection for pubsub
  this.connection = this.bus._connectionOne();
  if (!this.connection) {
    this.emit('error', 'no connection available');
    return null;
  }

  var _this = this;

  function onReady() {
    if (_this.isSubscribed()) {
      _this.subscribe();
    }
  }

  function onDetach() {
    _this.connection.removeListener('ready', onReady);
    _this.connection.removeListener('detach:'+_this.id, onDetach);
    _this.connection = null;
  }

  this.connection.on('ready', onReady);
  this.connection.on('detach:'+this.id, onDetach);

  return this.connection;
};

/**
 * Subscribe to the pubsub channel.
 * Messages arriving on the pubsub channel will be emitted through the 'message' event.
 */
Pubsub.prototype.subscribe = function() {
  var _this = this;
  var connection = this._connect();
  if (!connection) {
    return;
  }

  this.subscribed = true;

  this._subscribeEvent = function(type, channel, message) {
    switch (type) {
      case 'subscribe':
        _this.emit('subscribed');
        break;
      case 'unsubscribe':
        _this.emit('unsubscribed');
        break;
      case 'message':
        if (channel !== _this.id) {
          _this.emit('error', 'received message from unsubscribed channel ' + channel);
          return;
        }
        _this.emit('message', message);
        break;
    }
  };

  this.bus._subscribe(connection, this.id, this._subscribeEvent);
};

Pubsub.prototype.attach = Pubsub.prototype.subscribe;

/**
 * Unsubscribe from receiving messages
 */
Pubsub.prototype.unsubscribe = function() {
  var _this = this;
  if (!this.connection) {
    return;
  }

  this.subscribed = false;
  _this.bus._unsubscribe(this.connection, _this.id, this._subscribeEvent);
  delete this._subscribeEvent;
};

/**
 * Returns whether this pubsub is subscribed on the pubsub channel to receive messages
 */
Pubsub.prototype.isSubscribed = function() {
  return this.subscribed;
};

/**
 * Publish a message on the pubsub channel
 */
Pubsub.prototype.publish = function(message, cb) {
  var _this = this;
  var connection = this._connect();
  if (!connection) {
    return;
  }

  if (typeof message === 'object') {
    message = JSON.stringify(message);
  }

  connection.publish(_this.id, message, function(err) {
    if (err) {
      if (cb) {
        cb(err);
      } else {
        _this.emit('error', "error publishing message: " + err);
      }
      return;
    }
    cb && cb();
  });
};

/**
 * Unsubscribe and close this pubsub instance
 */
Pubsub.prototype.detach = function() {
  if (this.isSubscribed()) {
    this.unsubscribe();
  }

  if (this.connection) {
    this.connection.emit('detach:' + this.id);
  }
};

/**
 * Tells the federation object which methods save state that need to be restored upon
 * reconnecting over a dropped websocket connection
 * @private
 */
Pubsub.prototype._federationState = function() {
  return [{save: 'subscribe', unsave: 'unsubscribe'}];
};

exports = module.exports = Pubsub;