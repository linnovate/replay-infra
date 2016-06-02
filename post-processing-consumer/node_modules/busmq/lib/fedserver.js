var events = require('events');
var util = require('util');
var url = require('url');
var WebSocket = require('ws');
var WebSocketStream = require('websocket-stream');
var dnode = require('dnode');
var WSMux = require('./wsmux');

/**
 * FederationServer
 * @param bus
 * @param options
 * @constructor
 */
function FederationServer(bus, options) {
  events.EventEmitter.call(this);
  this.bus = bus;
  this.logger = bus.logger.withTag(bus.id + ':fedserver');
  this._options(options);
}

util.inherits(FederationServer, events.EventEmitter);

/**
 * Setup FederationServer options
 * @param options options to set
 * @private
 */
FederationServer.prototype._options = function(options) {
  this.options = util._extend({}, options);
  this.options.secret = this.options.secret || 'notsosecret';
  this.options.path = this.options.path || '/';
};

/**
 * Start the federation server
 */
FederationServer.prototype.listen = function() {
  if (this.listening) {
    return;
  }
  if (this.options.server) {
    var _this = this;
    var verifyClient = this.options.secret;
    if (typeof verifyClient !== 'function') {
      verifyClient = this._verifyClient.bind(this);
    }
    this.wss = new WebSocket.Server({server: this.options.server, verifyClient: verifyClient, path: this.options.path});

    var _onWssConnection = function(ws) {
      _this._onConnection(ws);
    };

    var _onWssListening = function() {
      _this.logger.isDebug() && _this.logger.debug('websocket server is listening');
      _this.listening = true;
      _this.emit('listening');
    };

    var _onWssError = function(err) {
      _this.logger.isDebug() && _this.logger.debug('error on websocket server: ' + JSON.stringify(err));
      _this.emit('error', err);
    };

    var _onWssShutdown = function() {
      _this.wss.removeListener('connection', _onWssConnection);
      _this.wss.removeListener('listening', _onWssListening);
      _this.wss.removeListener('error', _onWssError);
      _this.wss.removeListener('shutdown', _onWssShutdown);
      _this.wss.close();
      _this.wss = null;
    };

    this.wss.on('connection', _onWssConnection);
    this.wss.on('listening', _onWssListening);
    this.wss.on('error', _onWssError);
    this.wss.on('shutdown', _onWssShutdown);
  }
};

/**
 * Close the federation server
 */
FederationServer.prototype.close = function() {
  if (!this.listening) {
    return;
  }
  this.listening = false;
  this.wss.emit('shutdown');
};

/**
 * Handle a new connection
 * @param ws the new connection
 * @private
 */
FederationServer.prototype._onConnection = function(ws) {
  this.logger.isDebug() && this.logger.debug('new federate client connection');
  var _this = this;

  var onWsClose = function(code) {
    _this.logger.isDebug() && _this.logger.debug('websocket closed: ' + code);
    shutdown();
  };

  var onWsError = function(err) {
    _this.logger.isDebug() && _this.logger.debug('error on websocket: ' + JSON.stringify(err));
    shutdown();
  };

  function shutdown() {
    wsmux.removeListener('close', onWsClose);
    wsmux.removeListener('error', onWsError);
    wsmux.removeListener('channel', onChannel);
    wsmux.close();
  }

  function onChannel(channel) {
    _this._onChannel(channel);
  }

  var wsmux = new WSMux(ws, {mask: false});
  wsmux.on('close', onWsClose);
  wsmux.on('error', onWsError);
  wsmux.on('channel', onChannel);

};

/**
 * Handle a new channel
 * @param channel the new channel
 * @private
 */
FederationServer.prototype._onChannel = function(channel) {
  var object;
  var d;

  var _this = this;
  var onChannelMessage = function(msg) {
    _this.logger.isDebug() && _this.logger.debug('received message: ' + msg);
    try {
      msg = JSON.parse(msg);
    } catch (e) {
      _this.emit('error', 'error parsing incoming channel message ' + msg + ': ' + e.message);
      return;
    }
    object = _this.bus[msg.type].apply(_this.bus, msg.args);
    d = _this._federate(object, msg.methods, channel);
  };

  var onChannelClose = function() {
    shutdown();
    _this._endFederation('federate client connection closed', object, d);
  };

  var onChannelError = function(err) {
    shutdown();
    _this._endFederation('federate client error: ' + JSON.stringify(err), object, d);
  };

  function shutdown() {
    channel.removeListener('message', onChannelMessage);
    channel.removeListener('close', onChannelClose);
    channel.removeListener('error', onChannelError);
  }
  channel.once('message', onChannelMessage);
  channel.on('close', onChannelClose);
  channel.on('error', onChannelError);
};

/**
 * Hookup all the needed methods of the object to be served remotely
 * @param object
 * @param methods
 * @param channel
 * @private
 */
FederationServer.prototype._federate = function(object, methods, channel) {

  this.logger.isDebug() && this.logger.debug('creating federated object ' + object.id);

  var federatable = {};
  methods.forEach(function(method) {
    federatable[method] = function(args) {
      // the arguments arrive as a hash, so make them into an array
      var _args = Object.keys(args).map(function(k) {return args[k]});
      // invoke the real object method
      object[method].apply(object, _args);
    }
  });

  // setup dnode to receive the methods of the object
  var d = dnode(federatable);

  // tell the client that we are ready
  channel.send('ready');

  // start streaming rpc
  var channelStream = WebSocketStream(channel);
  channelStream.pipe(d).pipe(channelStream);
  d._federationStream = channelStream;
  return d;
};

FederationServer.prototype._endFederation = function(msg, object, d) {
  this.logger.isDebug() && this.logger.debug('['+(object?object.id:'uninitialized')+'] ' + msg);
  if (d) {
    d.end();
    d._federationStream.unpipe(d);
    delete d._federationStream;
  }
  object && object.detach && object.detach();
  object && object.unpersist && object.unpersist();
};

/**
 * Accept or reject a connecting web socket. the connecting web socket must contain a valid secret query param
 * @param info
 * @returns {*|boolean}
 * @private
 */
FederationServer.prototype._verifyClient = function(info) {
  var parsed = url.parse(info.req.url, true);
  return parsed.query && (parsed.query.secret === this.options.secret);
};

module.exports = exports = FederationServer;
