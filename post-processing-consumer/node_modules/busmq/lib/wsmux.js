var EventEmitter = require('events').EventEmitter;
var util = require('util');
var crypto = require('crypto');
var WebSocket = require('ws');

/**
 * A channel on a mulitplexed websocket
 * @param id the id of the channel
 * @param mux the parent websocket multiplexer
 * @constructor
 */
function WSMuxChannel(id, mux) {
  EventEmitter.call(this);
  this.id = id;
  this.mux = mux;
  this.closed = false;
  this.url = this.mux.url;

  // websocket-stream relies on this method
  this.__defineGetter__('readyState', function() {
    return this.mux._readyState();
  });
}

util.inherits(WSMuxChannel, EventEmitter);

/**
 * shim for websocket-stream
 */
WSMuxChannel.prototype.addEventListener = function(event, cb) {
  var _this = this;
  this.on(event, function() {
    if (event === 'message') {
      if (_this.closed) {
        // ignore the message if already closed
        return;
      }
      arguments[0] = {data: arguments[0]}
    }
    cb.apply(null, arguments);
  });
};

/**
 * Send a message on the channel
 * @param message
 * @param cb
 */
WSMuxChannel.prototype.send = function(message, cb) {
  if (this.closed) {
    this.emit('error', 'cannot send on closed channel');
    return;
  }
  this.mux._sendMessage(this.id, message, cb);
};

/**
 * Close this channel
 */
WSMuxChannel.prototype.close = function() {
  this.mux._closeChannel(this.id, true, 'channel close requested');
  this.closed = true;
};

/**
 * Websocket multiplexer
 * @param urlOrWs the url to open the webscoket to multiplex
 * @param options
 * @constructor
 */
function WSMux(urlOrWs, options) {
  EventEmitter.call(this);
  this.options = util._extend({mask: true}, options);
  this.closed = false;
  this.channels = {};
  this.pending = [];
  this._openWebsocket(urlOrWs);
}

util.inherits(WSMux, EventEmitter);

/**
 * attach a websocket to this multiplexer
 * @private
 */
WSMux.prototype._openWebsocket = function(urlOrWs) {

  var url, ws, reopen;
  if (typeof urlOrWs === 'string') {
    reopen = true;
    url = urlOrWs;
    ws = new WebSocket(url + '?secret=' + this.options.secret);
  } else {
    reopen = false;
    ws = urlOrWs;
    url = ws.url;
  }

  this.url = url;
  var _this = this;

  var heartbeatTimer;
  function clearHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function onOpen() {
    heartbeatTimer = setInterval(function() {
      ws.ping('hb', {}, true);
    }, 10*1000);

    // send any pending messages
    _this.pending.forEach(function(msg) {
      _this._wsSend(msg, null);
    });
    _this.pending = [];

    _this.emit('open');
  }

  function onClose(code) {
    _this.emit('close', code);
    replace();
  }

  function onError(error) {
    _this.emit('error', error);
    replace(_this.options.replaceDelay);
  }

  function onUnexpectedResponse(req, res) {
    // 401 means wrong secret key
    if (res.statusCode === 401) {
      _this.emit('fatal', 'unauthorized');
      // do not replace the websocket
      shutdown();
    } else {
      _this.emit('error', 'websocket received unexpected response: ' + res.statusCode);
      // try to open the websocket again
      replace(_this.options.replaceDelay);
    }
  }

  function onMessage(message) {
    _this._onMessage(message);
  }

  function shutdown() {
    _this._closeAllChannels(false, 'websocket closed');
    clearHeartbeat();
    if (ws) {
      ws.removeListener('open', onOpen);
      ws.removeListener('close', onClose);
      ws.removeListener('error', onError);
      ws.removeListener('unexpected-response', onUnexpectedResponse);
      ws.removeListener('message', onMessage);
      ws.removeListener('replace', replace);
      ws.removeListener('shutdown', shutdown);
      ws.close();
      ws = null;
      _this.ws = null;
    }
  }

  function replace(delay) {
    shutdown();

    if (_this.closed || !reopen) {
      return;
    }

    _this.emit('reopen');

    // open a new websocket.
    // we either do it immediately or delay it by the amount specified
    setTimeout(function() {
      _this._openWebsocket(url);
    }, delay || 0);
  }

  ws.on('open', onOpen);
  ws.on('close', onClose);
  ws.on('error', onError);
  ws.on('unexpected-response', onUnexpectedResponse);
  ws.on('message', onMessage);
  ws.on('replace', replace);
  ws.on('shutdown', shutdown);

  this.ws = ws;

};

/**
 * Get the websocket ready state
 * @private
 */
WSMux.prototype._readyState = function() {
  return this.ws.readyState;
};

/**
 * Create a new channel over the multiplexed websocket
 * @param id
 * @returns {WSMuxChannel}
 */
WSMux.prototype.channel = function(id) {
  return this._createChannel(id);
};

/**
 * Create a new channel
 * @param id
 * @returns {WSMuxChannel}
 * @private
 */
WSMux.prototype._createChannel = function(id) {
  id = id || crypto.randomBytes(8).toString('hex');
  var channel = new WSMuxChannel(id, this);
  this.channels[id] = channel;
  return channel;
};


/**
 * Send a message on the channel
 * @param id id of the channel
 * @param message the message to send
 * @private
 */
WSMux.prototype._sendMessage = function(id, message, cb) {
  this._wsSend({id: id, msg: message}, cb);
};

/**
 * Close a channel
 * @param id the id of the channel to close
 * @param send whether to send the other side that we want to close this channel
 * @param message close reason
 * @private
 */
WSMux.prototype._closeChannel = function(id, send, message) {
  if (send) {
    this._wsSend({id: id, close: true}, null);
  }

  var _this = this;
  process.nextTick(function() {
    if (_this.channels[id]) {
      var channel = _this.channels[id];
      delete _this.channels[id];
      channel.emit('close', message);
    }
  });
};

/**
 * Closes all channels
 * @param send whether to send the other side that this channel is closed
 * @param message close reason
 * @private
 */
WSMux.prototype._closeAllChannels = function(send, message) {
  var _this = this;
  Object.keys(this.channels).forEach(function(id) {
    _this._closeChannel(id, send, message);
  });
};

/**
 * Send a message now or later when the websocket is open
 * @param msg
 * @param cb
 * @private
 */
WSMux.prototype._wsSend = function(msg, cb) {
  if (!this.channels[msg.id]) {
    return;
  }

  // create a packet that will be sent over the wire.
  // the packet is a buffer containing: <16 bytes channel id><1 byte packet type><message payload>
  if (this.ws && this.ws.readyState === 1) {
    var data;
    var msgId = new Buffer(msg.id, 'ascii');
    if (msg.msg) {
      data = Buffer.concat([msgId, new Buffer('1', 'ascii'), new Buffer(msg.msg, 'utf8')]);
    } else if (msg.close) {
      data = Buffer.concat([msgId, new Buffer('2', 'ascii')]);
    }
    this.ws.send(data, {binary: true, mask: this.options.mask}, cb);
  } else {
    this.pending.push(msg);
  }
};

/**
 * Handle a message received on the weboscket and pass it on to the correct channel
 * @param message
 * @private
 */
WSMux.prototype._onMessage = function(message) {
  // first 16 chars are the channel id, next char is the type of message
  var packet = {
    id: message.slice(0, 16).toString(),
    type: message.slice(16, 17).toString()
  };

  if (packet.type === '1') {
    packet.msg = message.slice(17);
  } else if (packet.type === '2') {
    packet.close = true;
  }

  var channel = this.channels[packet.id];

  // close the channel
  if (packet.close) {
    if (channel) {
      // because we got the close from the other end, no need to send it over
      this._closeChannel(packet.id, false, 'remote end closed the channel');
    }
    return;
  }

  // if we don't have a channel, create one now
  if (!channel) {
    channel = this._createChannel(packet.id);
    this.emit('channel', channel);
  }

  var msg = packet.msg;
  channel.emit('message', msg);
};

/**
 * Close this websocket multiplexer
 */
WSMux.prototype.close = function () {
  this.closed = true;
  this._closeAllChannels(true, 'multiplexer closed');
  var _this = this;
  process.nextTick(function() {
    _this.emit('shutdown');
  });
};

exports = module.exports = WSMux;