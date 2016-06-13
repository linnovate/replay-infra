var events = require('events');
var util = require('util');
var logger = require('./logger');
var WSMux = require('./wsmux');

/**
 * A pool of websockets that keeps a minimum of open websockets to a list of bus federation servers
 * @param bus the bus owning this pool
 * @param options additional options
 * @constructor
 */
function WSPool(bus, options) {
  events.EventEmitter.call(this);
  this.setMaxListeners(0);
  this.bus = bus;
  this.logger = bus.logger.withTag(bus.id+':wspool');

  options = options || {};
  this.options = options;
  this.options.secret = options.secret || 'notsosecret';

  if (!options.poolSize || options.poolSize <= 0) {
    options.poolSize = 10;
  }

  this.options.poolSize = options.poolSize;
  this.options.replaceDelay = this.options.replaceDelay || 5000;
  this.logger.isDebug() && this.logger.debug('websocket pool size set to ' + this.options.poolSize);

  this.pool = {};
  this.closed = false;

  var _this = this;
  this.options.urls = this.options.urls || [];
  this.logger.isDebug() && this.logger.debug('setting up ' + this.options.poolSize + ' websockets per pool for urls: ' + JSON.stringify(this.options.urls));
  this.options.urls.forEach(function(url) {
    _this.pool[url] = [];
    for (var i = 0; i < _this.options.poolSize; ++i) {
      _this._add(url);
    }
  });
}

util.inherits(WSPool, events.EventEmitter);

/**
 * Add a new websocket to the pool
 * @param url the url to open the websocket to
 * @private
 */
WSPool.prototype._add = function(url) {
  if (this.closed) {
    return;
  }

  if (!this.pool[url]) {
    this.logger.isDebug() && this.logger.debug('cannot add websocket to ' + url + ': url is not recognized');
    return;
  }

  var _this = this;
  this.logger.isDebug() && this.logger.debug('opening websocket to ' + url);
  var wsmux = new WSMux(url, this.options);
  this.pool[url].push(wsmux);

  function onOpen() {
    _this.logger.isDebug() && _this.logger.debug('websocket to ' + url + ' added to pool');
  }

  function onClose() {
    _this.logger.isDebug() && _this.logger.debug('websocket to ' + url + ' closed');
  }

  function onError(error) {
    _this.logger.isDebug() && _this.logger.debug('websocket to ' + url + ' error: ' + JSON.stringify(error));
  }

  function onReopen() {
    _this.logger.isDebug() && _this.logger.debug('websocket to ' + url + ' is reopened');
  }

  function onFatal(error) {
    _this.logger.isDebug() && _this.logger.debug('websocket to ' + url + ' fatal error (placing url in error state): ' + JSON.stringify(error));
    _this.pool[url] = error;
  }

  function onShutdown() {
    wsmux.removeListener('open', onOpen);
    wsmux.removeListener('close', onClose);
    wsmux.removeListener('error', onError);
    wsmux.removeListener('fatal', onFatal);
    wsmux.removeListener('reopen', onReopen);
    wsmux.removeListener('shutdown', onShutdown);
    wsmux.close();
  }

  wsmux.on('open', onOpen);
  wsmux.on('close', onClose);
  wsmux.on('error', onError);
  wsmux.on('fatal', onFatal);
  wsmux.on('reopen', onReopen);
  wsmux.on('shutdown', onShutdown);

};

/**
 * Get a websocket channel from the pool for the specified url, a new channel on a random websocket will be created.
 * @param url the url to get the websocket for. if none is available right now it will be retrieved once one is available.
 * @param cb receives the websocket channel
 */
WSPool.prototype.get = function(url, cb) {
  // the url is not supported
  if (!this.pool[url]) {
    process.nextTick(function() {
      cb && cb('url ' + url + ' is not recognized');
    });
    return;
  }

  var _this = this;

  // the url is in error state
  if (typeof this.pool[url] === 'string') {
    process.nextTick(function() {
      cb && cb(_this.pool[url]);
    });
    return;
  }

  // create a new channel over a websocket from the pool selected in round-robin
  var wsmux = _this.pool[url].shift();
  var channel = wsmux.channel();
  _this.pool[url].push(wsmux);
  cb && cb(null, channel);
};

/**
 * Close the pool and disconnect all open websockets
 */
WSPool.prototype.close = function() {
  this.closed = true;
  var _this = this;
  Object.keys(this.pool).forEach(function(url) {
    if (typeof _this.pool[url] !== 'string') {
      _this.pool[url].forEach(function(wsmux) {
        wsmux.emit('shutdown');
      });
    }
  });
  this.pool = {};
};

exports = module.exports = WSPool;