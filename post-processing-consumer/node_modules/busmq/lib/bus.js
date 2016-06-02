var fs = require('fs');
var events = require('events');
var util = require('util');
var crypto = require('crypto');
var Logger = require('./logger');
var driver = require('./driver');
var Connection = require('./connection');
var WSPool = require('./wspool');
var Queue = require('./queue');
var Channel = require('./channel');
var Persistify = require('./persistify');
var Pubsub = require('./pubsub');
var FederationServer = require('./fedserver');
var Federate = require('./federate');

/**
 * A message bus.
 * Options:
 *  - redis - url string of a single redis to connect to or an array of string urls to connects to. a url must have the form redis://<host>[:<port>]
 *  - layout
 *      'direct': direct connection to redis instances (default)
 *      'sentinels': urls provided are that of sentinels (only supported by the ioredis driver)
 *      'cluster': urls provided belong to a redis cluster (only supported by the ioredis driver)
 *  - redisOptions: options to pass to the redis client on instantiation (default to {}). Driver specific.
 *  - driver: redis driver to use: 'node-redis' or 'ioredis' (defaults to 'node-redis')
 *  - federate - object with the following options:
 *    - server - an http/https server object to listen for incoming federate connections. if undefined then federation server will not be open.
 *    - secret - a secret key to authenticate with the federates. this key must be shared among all federates. default is 'notsosecret'.
 *    - path - specifies the path within the server to accept federation connections on
 * @constructor
 */
function Bus(options) {
  events.EventEmitter.call(this);

  this.id = "bus:" + crypto.randomBytes(8).toString('hex');
  this.logger = new Logger(this.id);

  this.connections = [];

  this.online = false;
  this.eventsCallbacks = {};

  this._options(options);

  this._startFederationServer();

  if (this.options.redis.length > 0) {
    this._loadScripts();
  } else {
    var _this = this;
    process.nextTick(function() {
      _this.emit('online');
    });
  }
}

util.inherits(Bus, events.EventEmitter);

/**
 * Setup bus options
 * @param options options to set
 * @private
 */
Bus.prototype._options = function(options) {
  this.options = options || {};

  if (!this.options.redis) {
    this.options.redis = [];
  }

  if (typeof this.options.redis === 'string') {
    this.options.redis = [this.options.redis];
  }

  if (this.options.logLevel) {
    this.logger.level(this.options.logLevel);
  }

  if (this.options.logger) {
    this.withLog(this.options.logger);
  }

  this.driver = driver(this.options.driver || 'node-redis');
  this.logger.isDebug() && this.logger.debug('using "'+this.driver.name+'" driver');
  // this.setupDriver(this.options.driver);

  this.options.layout = this.options.layout || 'direct';

  this.wspool = new WSPool(this, this.options.federate);
};


/**
 * Turn debug messages to the log on or off
 * @param on
 */
Bus.prototype.debug = function(on) {
  this.logger.level(on ? 5 : 2);
  return this;
};

/**
 * Set the logger object
 * @param logger
 */
Bus.prototype.withLog = function(logger) {
  this.logger.withLog(logger);
  return this;
};


Bus.prototype._startFederationServer = function() {
  if (this.options.federate && this.options.federate.server) {
    this.fedServer = new FederationServer(this, this.options.federate);
  }
};

/**
 * Load the lua scripts used for managing the queue
 * @private
 */
Bus.prototype._loadScripts = function() {
  this.scripts = {};
  this.scriptsToLoad = 0;
  this.scriptsLoaded = false;
  this._readScript('push');
  this._readScript('pop');
  this._readScript('ack');
  this._readScript('index');
};

/**
 * Read a single script to memory
 * @param name the script name to load
 * @private
 */
Bus.prototype._readScript = function(name) {
  ++this.scriptsToLoad;
  var _this = this;
  var file = __dirname + '/lua/'+name+'.lua';
  fs.readFile(file, function(err, content) {
    if (err) {
      _this.logger.isDebug() && _this.logger.debug('error reading lua script ' + file + ': ' + JSON.stringify(err));
      _this.emit('error', err);
      return;
    }
    _this.scripts[name] = {content: content.toString().trim(), name: name};
    if (--_this.scriptsToLoad === 0) {
      _this.scriptsLoaded = true;
      _this._online();
    }
  });
};

/**
 * Get the hash of a script by name
 * @param name
 * @returns {*}
 * @private
 */
Bus.prototype._script = function(name) {
  return this.scripts[name].hash;
};

/**
 * Connect the bus to the specified urls.
 * Events: error, online, offline
 */
Bus.prototype.connect = function() {
  if (this.connections.length > 0) {
    this.emit('error', 'already connected');
    return;
  }

  var _this = this;
  var directConnections = this.options.redis;
  if (this.options.layout === 'direct') {
    this.logger.isDebug() && this.logger.debug("bus connecting directly to redises @ " + this.options.redis);
    var readies = 0;
    directConnections.forEach(function(param, index) {
      // open the connections to redis
      createConnection(index,_this,
          function() {
            _this.logger.isDebug() &&  _this.logger.debug("connection "+(index+1)+" of "+ _this.options.redis.length + " is ready");
            // emit the ready event only when all connections are ready
            if (++readies === _this.connections.length) {
              _this.connectionsReady = true;
              _this._online();
            }
          },
          function(err) {
            if (readies > 0 && --readies === 0) {
              _this.connectionsReady = false;
              _this._offline(err);
            }
          }
      )
    });
  } else if (this.options.layout === 'sentinels') {
    //create a single connection via the sentinels
    this.logger.isDebug() && this.logger.debug("bus connecting via sentinels @ " + this.options.redis);
    createConnection(0,_this,
        function() {
          _this.logger.isDebug() &&  _this.logger.debug("connection via sentinels is ready");
          _this.connectionsReady = true;
          _this._online();
        },
        function(err) {
          _this._offline(err);
        }
    )
  } else if (this.options.layout === 'cluster') {
    createConnection(-1,_this,
        function() {
          _this.logger.isDebug() &&  _this.logger.debug("connection to cluster is ready");
          _this.connectionsReady = true;
          _this._online();
        },
        function(err) {
          _this._offline(err);
        }
    )
  } else {
    _this.emit('error', 'unsupported connection layout: '+this.options.layout);
    return;
  }

  if (this.fedServer) {
    this.fedServer.listen();
  }
};


function createConnection(index, bus, readyCallback, endCallback) {
  var connection = new Connection(index, bus);
  bus.connections.push(connection);

  var _onConnectionEnd = function (err) {
    endCallback(err);
  };

  var _onConnectionClose = function (err) {
  };

  var _onConnectionError = function (err) {
    bus.emit('error', err);
  };

  var _onConnectionConnect = function () {
  };

  var _onConnectionReady = function () {
    readyCallback();
  };

  //var _onConnectionSubscribe = function (channel, count) {
  //  if (bus.eventsCallbacks[channel]) {
  //    bus.eventsCallbacks[channel]('subscribe', channel, count);
  //  }
  //};
  //
  //var _onConnectionUnsubscribe = function (channel, count) {
  //  if (bus.eventsCallbacks[channel]) {
  //    bus.eventsCallbacks[channel]('unsubscribe', channel, count);
  //  }
  //};

  var _onConnectionMessage = function (message) {
    if (bus.eventsCallbacks[message.channel]) {
      bus.eventsCallbacks[message.channel].forEach(function(cb) {
        cb('message', message.channel, message.message);
      });
    }
  };

  var _onConnectionCleanup = function() {
    connection.removeListener("end", _onConnectionEnd);
    connection.removeListener("close", _onConnectionClose);
    connection.removeListener("error", _onConnectionError);
    connection.removeListener("connect", _onConnectionConnect);
    connection.removeListener("ready", _onConnectionReady);
    //connection.removeListener("subscribe", _onConnectionSubscribe);
    //connection.removeListener("unsubscribe", _onConnectionUnsubscribe);
    connection.removeListener("message", _onConnectionMessage);
    connection.removeListener("cleanup", _onConnectionCleanup);
  };


  connection.on("end", _onConnectionEnd);
  connection.on("close", _onConnectionClose);
  connection.on("error", _onConnectionError);
  connection.on("connect", _onConnectionConnect);
  connection.on("ready", _onConnectionReady);
  //connection.on("subscribe", _onConnectionSubscribe); //ioredis does not emit this
  //connection.on("unsubscribe", _onConnectionUnsubscribe);
  connection.on("message", _onConnectionMessage);
  connection.on('cleanup', _onConnectionCleanup);

  connection.connect();
}

/**
 * Invoked when the bus is online, i.e. all connections are ready
 */
Bus.prototype._online = function() {
  if (this.connectionsReady && this.scriptsLoaded) {
    this.logger.isDebug() && this.logger.debug("uploading scripts to redis");
    var _this = this;
    var scriptKeys = Object.keys(_this.scripts);
    var dones = scriptKeys.length * this.connections.length;
    // load the scripts to redis
    this.connections.forEach(function(connection) {
      scriptKeys.forEach(function(key) {
        var script = _this.scripts[key];
        // send the script to redis
        var handler = function(err, resp) {
          if (err) {
            _this.emit('error', 'failed to upload script ' + script.name + ' to redis: ' + err);
            return;
          }
          else {
            //cluster will send back the hash as many times as there are nodes
            script.hash = Array.isArray(resp) ? resp[0] : resp;
          }
          if (--dones === 0) {
            _this.online = true;
            _this.logger.isDebug() && _this.logger.debug("bus is online");
            _this.emit('online');
          }
        };
        if (_this.options.layout === 'cluster') {
          connection.to( 'all' ).call( 'script', 'load', script.content, handler );
        } else {
          connection.script( 'load', script.content, handler );
        }
      });
    });
  }
};

/**
 * Invoked when the bus is offline, i.e. all connections are down
 */
Bus.prototype._offline = function(err) {
  var shouldEmit = this.isOnline();
  this.online = false;
  this.logger.isDebug() && this.logger.debug("bus is offline");
  if (shouldEmit) {
    this.emit('offline', err);
  }
};

/**
 * Returns whether the bus is online or not
 * @returns {boolean|*}
 */
Bus.prototype.isOnline = function() {
  return this.online;
};

/**
 * Get the first available connection
 * @returns {*}
 * @private
 */
Bus.prototype._connectionOne = function() {
  return this.connections[0];
};

/**
 * Get the next available connection
 * @returns {*}
 * @private
 */
Bus.prototype._connectionFor = function(key) {
  var sum = 0;
  for (var i = 0; i < key.length; ++i) {
    sum += key.charCodeAt(i);
  }
  var index = sum % this.connections.length;
  return this.connections[index];
};

/**
 * Get an existing connection to redis to serve the specified key.
 * A random connection is chosen if the key does not exist anywhere.
 * @param key
 * @param cb
 * @private
 */
Bus.prototype._connection = function(key, cb) {
  // most of the time the connections state will be stable so the fastest
  // way is to directly search a specific connection.
  var _this = this;
  var responses = this.connections.length;

  var _callback = function(connection) {
    if (connection) {
      cb && cb(connection);
      _callback = null;
      return;
    }
    if (--responses === 0) {
      // got a response from all the connections
      _callback = null;
      connection = _this._connectionFor(key);
      cb && cb(connection);
    }
  };

  // search for the key in all the connections
  this.connections.forEach(function(c) {
    if (!c.isReady()) {
      _callback && _callback(null);
      return;
    }
    c.exists(key, function(err, resp) {
      if (err) {
        _this.emit('error', "error searching for existing key " + key + ": " + err);
      }
      if (resp === 1) {
        // found it
        _callback && _callback(c);
      } else {
        _callback && _callback(null);
      }
    });
  });
};

/**
 * Disconnect all redis connections, close the fedserver and close all the wspool websocket connections
 */
Bus.prototype.disconnect = function() {
  this.logger.isDebug() && this.logger.debug("disconnecting");

  var _this = this;
  this.once('offline', function() {
    _this.emit('cleanup');
  });

  this.connections.forEach(function(c) {
    c.disconnect();
  });
  this.connections = [];

  if (this.fedServer) {
    this.fedServer.close();
    this.fedServer = null;
  }

  if (this.wspool) {
    this.wspool.close();
    this.wspool = null;
  }
};

/**
 * Subscribe to events on the specified channels on the provided connection
 * @param connection
 * @param channels
 * @param cb
 * @private
 */
Bus.prototype._subscribe = function(connection, channels, cb) {
  if (!Array.isArray(channels)) {
    channels = [channels];
  }
  var _this = this;
  channels.forEach(function(channel) {
    _this.eventsCallbacks[channel] = _this.eventsCallbacks[channel] || [];
    _this.eventsCallbacks[channel].push(cb);
  });
  connection.subscribe(channels, function(err) {
    if (err) {
      _this.emit('error', "error subscribing to channels " + channels + ": " + err);
      return;
    }
    channels.forEach(function(c) {
      cb('subscribe', c);
    });
  });
};

/**
 * Unsubscribe from events on the specified channels on the provided connection
 * @param connection
 * @param channels
 * @param cb
 * @private
 */
Bus.prototype._unsubscribe = function(connection, channels, cb) {
  if (!Array.isArray(channels)) {
    channels = [channels];
  }
  var _this = this;
  channels.forEach(function(channel) {
    if (_this.eventsCallbacks[channel]) {
      var index = _this.eventsCallbacks[channel].indexOf(cb);
      if (index !== -1) {
        _this.eventsCallbacks[channel].splice(index, 1);
        if (_this.eventsCallbacks[channel].length === 0) {
          delete _this.eventsCallbacks[channel];
        }
        connection.unsubscribe(channels, function(err) {
          if (err) {
            _this.emit('error', "error unsubscribing from channels " + channels + ": " + err);
            return;
          }
          channels.forEach(function(c) {
            cb('unsubscribe', c);
          });
        });
      }
    }
  });

};

/**
 * Create a message queue.
 * @param name
 * @returns {Queue} a Queue object
 */
Bus.prototype.queue = function(name) {
  return new Queue(this, name);
};

/***
 * Create a bi-directional channel.
 * @param name the name of the channel
 * @param local the name of the local endpoint. default is 'client' if calling #connect and 'server' if calling #listen.
 * @param remote the name of the remote endpoint. default is 'server' if calling #connect and 'client' if calling #listen.
 * @returns {Channel} a Channel object
 */
Bus.prototype.channel = function(name, local, remote) {
  return new Channel(this, name, local, remote);
};

/**
 * Persistify the provided object, enabling the object to be persisted to redis
 * @param name name of the object
 * @param object the object to persist
 * @param attributes array of property names to persist in the object. The properties will be automatically defined on the object.
 * @returns {*}
 */
Bus.prototype.persistify = function(name, object, attributes) {
  return Persistify(this, name, object, attributes);
};

/**
 * Create a pubsub channel.
 * @param name
 * @returns {Pubsub} a Pubsub object
 */
Bus.prototype.pubsub = function(name) {
  return new Pubsub(this, name);
};

/**
 * Federate an object to the specified remote bus
 * @param object queue, channel or persisted object
 * @param target string url of the remote bus to federate to
 * @returns {Federate} the federation object. It's possible to use the federation object only after the 'ready' event is emitted.
 */
Bus.prototype.federate = function(object, target) {
  return new Federate(object, target, this.wspool, this.options.federate);
};

function create(options) {
  return new Bus(options);
}

exports = module.exports.create = create;
