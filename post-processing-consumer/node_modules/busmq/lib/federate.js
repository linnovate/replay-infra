var events = require('events');
var util = require('util');
var url = require('url');
var WebSocketStream = require('websocket-stream');
var dnode = require('dnode');

/**
 * Federate
 * @param object
 * @param target
 * @param wspool
 * @param options
 * @constructor
 */
function Federate(object, target, wspool, options) {
  events.EventEmitter.call(this);
  this.object = object;
  this.target = target;
  this.reconnecting = false;
  this.channelpool = wspool;
  this.state = {};
  this._options(options);
  this.queue = [];
  this._attachWs(false);
}

util.inherits(Federate, events.EventEmitter);

/**
 * Setup Federate options
 * @param options options to set
 * @private
 */
Federate.prototype._options = function(options) {
  this.options = util._extend({}, options);
  this._setupMethods();
};

/**
 * Set the methods that need to be federated.
 * if not specifically specified then federate all the public methods.
 * @private
 */
Federate.prototype._setupMethods = function() {
  var _this = this;
  if (this.object.federatedMethods) {
    this.options.methods = this.object.federatedMethods;
  } else {
    var methods = ['on', 'once'].concat(Object.getOwnPropertyNames(_this.object.constructor.prototype));
    this.options.methods = methods.filter(function(prop) {
      return typeof _this.object[prop] === 'function' && prop.indexOf('_') !== 0 && prop !== 'constructor';
    });
  }

  this._setupStateTracker();
};

/**
 * Some methods need tracking to be invoked again if the underlying websocket is dropped and reconnects again
 * @private
 */
Federate.prototype._setupStateTracker = function() {
  var _this = this;

  // always track event emitter methods
  this.state['on'] = {
    events: {},
    save: function(args) {
      this.events[args[0]] = args;
    },
    args: function() {
      // return an array of args of all the listener events that are registered
      return Object.keys(this.events).map(function(e) {return this.events[e];}.bind(this));
    }
  };
  this.state['removeListener'] = {
    unsave: function(args) {
      delete _this.state['on'].events[args[0]];
    }
  };

  // also track custom methods from the object
  if (this.object._federationState) {
    var state = this.object._federationState();
    state.forEach(function(pair) {
      // save the state when this method is invoked
      _this.state[pair.save] = {save: pair.save};
      // turn off the state if this method is invoked
      _this.state[pair.unsave] = {unsave: typeof pair.unsave === 'function' ? pair.unsave : pair.save};
    });
  }
};

Federate.prototype._attachWs = function(reconnect) {
  var _this = this;
  this.channelpool.get(this.target, function(err, ws) {
    if (err) {
      if (err === 'unauthorized') {
        _this.emit('unauthorized');
      } else {
        _this.emit('error', err);
      }
      return;
    }
    _this._to(ws, reconnect);
  });
};

/**
 * Start federating the object through the specified websocket
 * @param channel a channel to federate over
 * @param reconnect whether this is a reconnection for the same object
 * @returns {Federate}
 */
Federate.prototype._to = function(channel, reconnect) {
  if (this.channel) {
    this.emit('error', 'already federating to ' + this.object.id);
  }

  var _this = this;

  var _onWsMessage = function(msg) {
    if (msg.slice(0,5).toString() === 'ready') {
      _this._federate(reconnect);
    }
  };

  var _onWsUnexpectedResponse = function(req, res) {
    // unauthorized means wrong secret key
    var reason = 'unexpected response';
    var error;
    if (res.statusCode === 401) {
      reason = 'unauthorized';
      _this.emit(reason);
    } else {
      error = 'federation received unexpected response ' + res.statusCode;
    }
    _onWsShutdown(reason, error);
  };

  var _onWsError = function(error) {
    _this.object.logger.isDebug() && _this.object.logger.debug('federation transport error: ' + error);
    _onWsShutdown('error', error);
  };

  var _onWsClose = function(message) {
    _this.object.logger.isDebug() && _this.object.logger.debug('federation transport closed: ' + message);
    _onWsShutdown('unexpected closed', 'closed due to ' + message);
  };

  var _onWsShutdown = function(reason, error) {
    _this.object.logger.isDebug() && _this.object.logger.debug('federation transport shutting down: ' + reason + (error ? '('+error+')' : ''));
    channel.removeListener('message', _onWsMessage);
    channel.removeListener('unexpected-response', _onWsUnexpectedResponse);
    channel.removeListener('error', _onWsError);
    channel.removeListener('close', _onWsClose);
    channel.removeListener('shutdown', _onWsShutdown);

    if (_this.channelStream) {
      _this.channelStream.unpipe();
      _this.channelStream = null;
    }

    if (_this.dnode) {
      _this.dnode.emit('shutdown');
      _this.dnode = null;
    }

    if (_this.channel) {
      _this.channel.close();
      _this.channel = null;
    }

    if (error) {
      _this._reconnect(reason);
    } else {
      _this.emit('close');
    }
  };

  channel.once('message', _onWsMessage);
  channel.on('unexpected-response', _onWsUnexpectedResponse);
  channel.on('error', _onWsError);
  channel.on('close', _onWsClose);
  channel.on('shutdown', _onWsShutdown);

  this.channel = channel;

  var parsedTarget = url.parse(channel.url, true);
  delete parsedTarget.search;
  delete parsedTarget.query.secret;
  this.target = url.format(parsedTarget);
  this.object.logger.isDebug() && this.object.logger.debug('starting federation to ' + this.target);

  this._sendCreationMessage();

  return this;
};

/**
 * Send the server the object creation message. federation will start once the server sends back the 'ready' message.
 * @private
 */
Federate.prototype._sendCreationMessage = function() {
  var msg = JSON.stringify(this._objectCreationMessage(this.object));
  this.object.logger.isDebug() && this.object.logger.debug('sending federation creation message ' + msg);
  this.channel.send(msg);
};

/**
 * Reconnect this federation object over a new transport
 */
Federate.prototype._reconnect = function(reason) {
  if (this.channel) {
    this.emit('error', 'cannot reconnect - already connected');
    return;
  }

  if (!this.reconnecting) {
    this.reconnecting = true;
    this.emit('reconnecting', reason);
  }
  this._attachWs(true);
};

/**
 * Stop federating the object and close the channel
 */
Federate.prototype.close = function() {
  if (this.channel) {
    this.channel.emit('shutdown', 'requested shutdown');
  }
};

Federate.prototype._objectCreationMessage = function(object) {
  var type = object.type;
  if (!type) {
    if (object._p) {
      type = 'persistify';
    }
  }
  var message = {type: type, methods: this.options.methods};
  switch(type) {
    case 'queue':
      message.args = [object.name];
      break;
    case 'channel':
      message.args = [object.name, object.local, object.remote];
      break;
    case 'persistify':
      message.args = [object._p.name, {}, object._p.attributes];
      break;
    case 'pubsub':
      message.args = [object.name];
      break;
  }
  return message;
};

/**
 * Federate the object methods
 * @private
 */
Federate.prototype._federate = function(reconnect) {
  var _this = this;

  function callRemote(method, args) {
    _this.remote[method].call(_this.remote, args);
  }

  // federate the methods to the remote endpoint.
  var methods = _this.options.methods;
  methods.forEach(function(method) {
    _this.object[method] = function() {

      // check if this is a state saving/unsaving method
      if (_this.state[method]) {
        // if we should save the state, that is save the args and invoke the method again on reconnect
        if (_this.state[method].save) {
          if (typeof _this.state[method].save === 'function') {
            _this.state[method].save(arguments);
          } else {
            _this.state[method].args = arguments;
          }
        } else {
          // this method clears the state that was set by another method
          if (typeof _this.state[method].unsave === 'function') {
            _this.state[method].unsave(arguments);
          } else {
            delete _this.state[_this.state[method].unsave].args;
          }
        }
      }

      // store the method calls until we are online
      if (!_this.remote) {
        _this.queue.push({method: method, args: arguments});
        return;
      }
      callRemote(method, arguments);
    }
  });

  this.dnode = dnode();

  var _onDnodeRemote = function(remote) {
    _this.remote = remote;

    if (reconnect) {
      // if we need to restore the remote object state
      Object.keys(_this.state).forEach(function(m) {
        if (_this.state[m].args) {
          if (typeof _this.state[m].args === 'function') {
            var args = _this.state[m].args();
            if (!Array.isArray(args)) {
              args = [args];
            }
            args.forEach(function(a) {
              callRemote(m, a);
            });
          } else {
            callRemote(m, _this.state[m].args);
          }
        }
      });
      _this.reconnecting = false;
      _this.emit('reconnected', _this.object);
    } else {
      _this.emit('ready', _this.object);
    }

    // call any methods that are pending because we were not connected
    _this.queue.forEach(function(e) {
      callRemote(e.method, e.args);
    });
    _this.queue = [];

  };

  var _onDnodeError = function(err) {
    _this.emit('error', err);
  };

  var _onDnodeFail = function(err) {
    _this.emit('fail', err);
  };

  var _onDnodeShutdown = function() {
    _this.dnode.removeListener('remote', _onDnodeRemote);
    _this.dnode.removeListener('shutdown', _onDnodeShutdown);
    _this.dnode.removeListener('error', _onDnodeError);
    _this.dnode.removeListener('fail', _onDnodeFail);
    _this.dnode.end();
    _this.remote = null;
  };

  this.dnode.on('remote', _onDnodeRemote);
  this.dnode.on('shutdown', _onDnodeShutdown);
  this.dnode.on('error', _onDnodeError);
  this.dnode.on('fail', _onDnodeFail);

  // wrap the websocket with a stream
  this.channelStream = WebSocketStream(this.channel);
  // pipe the stream through dnode
  this.channelStream.pipe(this.dnode).pipe(this.channelStream);
};

module.exports = exports = Federate;
