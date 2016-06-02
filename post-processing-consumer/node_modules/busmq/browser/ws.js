
var events = require('events');
var util = require('util');

/**
 * Module dependencies.
 */

var global = (function() { return this; })();

/**
 * WebSocket constructor.
 */

var WebSocket = global.WebSocket || global.MozWebSocket;

/**
 * Module exports.
 */

module.exports = WebSocket ? ws : null;

/**
 * WebSocket constructor.
 *
 * The third `opts` options object gets ignored in web browsers, since it's
 * non-standard, and throws a TypeError if passed to the constructor.
 * See: https://github.com/einaros/ws/issues/227
 *
 * @param {String} uri
 * @param {Array} protocols (optional)
 * @param {Object) opts (optional)
 * @api public
 */

function ws(uri, protocols, opts) {
  events.EventEmitter.call(this);
  var instance;
  if (protocols) {
    instance = new WebSocket(uri, protocols);
  } else {
    instance = new WebSocket(uri);
  }
  instance.binaryType = 'arraybuffer';
  this.instance = instance;

  this.__defineGetter__('readyState', function() {
    return instance.readyState;
  });

  this.__defineGetter__('url', function() {
    return instance.url;
  });

  this.__defineGetter__('bufferedAmount', function() {
    return instance.bufferedAmount;
  });

  this.__defineGetter__('protocol', function() {
    return instance.bufferedAmount;
  });

  this.__defineGetter__('binaryType', function() {
    return instance.binaryType;
  });
}

util.inherits(ws, events.EventEmitter);

ws.prototype.on = function(event, cb) {
  events.EventEmitter.prototype.on.apply(this, arguments);
  if (['message', 'open', 'close', 'error'].indexOf(event) !== -1) {
    var $this = this;
    this.instance['on' + event] = function(e) {
      $this.emit(event, e && e.data && new TextDecoder().decode(e.data));
    }
  }
};

ws.prototype.removeListener = function(event, cb) {
  events.EventEmitter.prototype.removeListener.apply(this, arguments);
  if (['message', 'open', 'close', 'error'].indexOf(event) !== -1) {
    delete this.instance['on' + event];
  }
};

ws.prototype.send = function(data) {
  this.instance.send(data);
};

ws.prototype.close = function() {
  this.instance.close();
};

ws.prototype.ping = function() {
  // ignore
};
