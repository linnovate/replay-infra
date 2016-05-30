
/**
 * Logger.
 * @param tag a tag to use on every message
 * @param logger the underlying logger instance
 * @constructor
 */
function Logger(tag, logger) {
  this._tag = tag;
  this._logger = logger;
  this._level = 1;

  // support the various logging functions
  var _this = this;
  ['log', 'trace', 'debug', 'info', 'warn', 'warning', 'error', 'fatal', 'exception'].forEach(function(f) {
    _this[f] = function() {
      if (_this._logger && LEVEL[f] <= _this._level) {
        var message;
        // add the tag to the message
        for (var i = 0; i < arguments.length; ++i) {
          if (typeof arguments[i] === 'string') {
            arguments[i] = "["+_this._tag+"] " + arguments[i];
            message = arguments[i];
            break;
          }
        }
        var method = _this._logger[f] || _this._logger['log'];
        method.apply(_this._logger, arguments);
      }
    }
  });
}

var LEVEL = Logger.prototype.LEVEL = {
  log: -1,
  exception: 0,
  fatal: 0,
  error: 1,
  warning: 2,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5
};

/**
 * Set or get the log level
 */
Logger.prototype.level = function() {
  if (arguments.length > 0) {
    var l = arguments[0];
    if (typeof l === 'string') {
      l = LEVEL[l] || 1;
    }
    var level = this._level;
    this._level = l;
    return level;
  } else {
    return this._level;
  }
};

/**
 * return true if the logger level is debug or more verbose
 */
Logger.prototype.isDebug = function() {
  return this._level >= LEVEL.debug;
};

/**
 * Set the underlying logger
 * @param logger
 */
Logger.prototype.withLog = function(logger) {
  this._logger = logger;
};

/**
 * Create a new logger backed by the same logger object but with a different tag
 * @param tag the tag to log with
 * @returns {Logger}
 */
Logger.prototype.withTag = function(tag) {
  var newLogger = new Logger(tag, this._logger);
  newLogger.level(this.level());
  return newLogger;
};

exports = module.exports = Logger;