var events = require('events');
var util = require('util');

const STATES = {
  ATTACHED: 1,
  ATTACHING: 2,
  DETACHED: 3,
  DETACHING: 4
};

/**
 * Queue. Do not instantiate directly, instead use {Bus#queue} to create a new Queue.
 * @param bus
 * @param name
 * @constructor
 */
function Queue(bus, name) {
  events.EventEmitter.call(this);
  this.setMaxListeners(0);
  this.bus = bus;
  this.type = 'queue';
  this.id = this.bus.options.layout === 'cluster' ? "{bus:queue:" + name + "}" : "bus:queue:" + name;
  this.logger = bus.logger.withTag(this.id);
  this.name = name;
  this._state = STATES.DETACHED;
  this.metadataKey = this.id + ":metadata";
  this.messagesKey = this.id + ":messages";
  this.messageIdKey = this.id + ":msgid";
  this.messagesToAckKey = this.id + ":toack";
  this.messageAvailableChannel = this.id + ":available";
  this.qKeys = [this.metadataKey, this.messagesKey, this.messageIdKey, this.messagesToAckKey];
  this.toucher = null;
  this._pushed = 0;
  this._consumed = 0;
}

util.inherits(Queue, events.EventEmitter);

/**
 * Setup association to the connection
 * @private
 */
Queue.prototype._connect = function(cb) {
  if (this.connection) {
    cb && cb();
    return;
  }

  var _this = this;

  // get a connection to use for this queue.
  // it is expected that if the queue already exists
  // in one of the redis servers then a connection to
  // that server will be provided
  this.bus._connection(this.metadataKey, function(connection) {
    if (!connection) {
      _this.emit('error', 'no connection available');
      return;
    }

    _this.connection = connection;
    _this._onConnectionDrain = function() {
      _this.emit('drain');
    };

    _this._onConnectionReady = function() {
      if (_this.isConsuming()) {
        _this._consumeMessages();
      }
    };

    _this.connection.on('ready', _this._onConnectionReady);
    _this.connection.on('drain', _this._onConnectionDrain);
    cb && cb();
  });
};

Queue.prototype._disconnect = function() {
  this.connection.removeListener('ready', this._onConnectionReady);
  delete this._onConnectionReady;
  this.connection.removeListener('drain', this._onConnectionDrain);
  delete this._onConnectionDrain;
};

/**
 * Emit the attached event. This sets an interval timer to continuously refresh the expiration of the queue keys.
 * @private
 */
Queue.prototype._emitAttached = function(exists) {
  // do nothing if we were asked to detach
  if (this._state !== STATES.ATTACHING) {
    return;
  }

  this._state = STATES.ATTACHED;
  // start the touch timer.
  // we touch the various queue keys to keep them alive for as long as we're attached.
  // the interval time is a third of the ttl time.
  var touchInterval = this._ttl / 3;
  this._touch();
  var _this = this;
  this.toucher = setInterval(function() {
    _this._touch();
  }, (touchInterval * 1000));

  this.emit('_attached');
  this.emit('attached', exists);
};

/**
 * set the queue keys expiration to the ttl time (to keep them alive)
 * @private
 */
Queue.prototype._touch = function(conn) {
  if (!this._ttl || this._ttl <= 0) {
    return;
  }
  conn = conn || this.connection;
  var _this = this;
  this.qKeys.forEach(function(key) {
    conn.expire(key, _this._ttl, function(err, resp) {
      if (err) {
        _this.emit('error', "error setting key " + key + " expiration to " + _this._ttl + ": " + err);
      }
    });
  })
};

/**
 * Emit the detached event. Clears the interval timer that refreshes the queue keys expiration
 * @private
 */
Queue.prototype._emitDetached = function() {
  clearInterval(this.toucher);
  this.toucher = null;
  this._state = STATES.DETACHED;
  this._ttl = null;
  this.emit('detached');
};

/**
 * Return true if we are attached to the queue
 */
Queue.prototype.isAttached = function(cb) {
  var attached = (this._state === STATES.ATTACHED);
  cb && cb(attached);
  return attached;
};

/**
 * Attach to a queue, optionally setting some options.
 * Events:
 *  - attaching - starting to attach to the queue
 *  - attached - messages can be pushed to the queue or consumed from it.
 *               receives a boolean indicating whether the queue already existed (true) or not (false)
 *  - error - some error occurred
 */
Queue.prototype.attach = function(options) {
  if (this.isAttached()) {
    this.emit('error', 'cannot attach to queue: already attached');
    return;
  }

  this._state = STATES.ATTACHING;
  var _this = this;
  function _attach() {
    _this.emit('attaching');
    options = options || {};
    options.ttl = options.ttl || 30; // default ttl of 30 seconds

    _this.ttl(function(err, ttl) {
      if (err) {
        _this.emit('error', err);
        return;
      }

      if (!ttl) {
        // queue does not exist, set options for the queue, creating the metadata key
        _this._ttl = options.ttl;
        _this.metadata('ttl', _this._ttl, function(err) {
          if (err) {
            _this.emit('error', err);
            return;
          }
          _this._emitAttached(false);
        });
        return;
      }

      // queue already exists, do not set options
      _this._ttl = ttl;
      _this._emitAttached(true);
    });
  }

  this._connect(_attach);
};


/**
 * Detach from the queue.
 * No further messages can be pushed or consumed until attached again.
 * This does not remove the queue. Other clients may still push and consume messages from the queue.
 * If this is the last client that detaches, then the queue will automatically be destroyed if no
 * client attaches to it within the defined ttl of the queue.
 * Events:
 *  - detached - detached from the queue
 *  - error - some error occurred
 */
Queue.prototype.detach = function() {
  if (this._state === STATES.DETACHING || this._state === STATES.DETACHED) {
    return;
  }

  this._state = STATES.DETACHING;
  this.emit('detaching');
  this.stop();
  this._disconnect();
  this._emitDetached();
};

/**
 * Get the ttl of the queue. The ttl is the time in seconds for the queue to live without any clients attached to it.
 * @param cb receives the ttl
 */
Queue.prototype.ttl = function(cb) {
  this.metadata('ttl', function(err, ttl) {
    if (err) {
      cb && cb(err);
      return;
    }
    if (ttl !== null) {
      ttl = parseInt(ttl);
    }
    cb && cb(null, ttl);
  });
};

/**
 * Get or set a metadata field.
 * @param name the metadata name. If a value is not provided, the metadata will be retrieved.
 * @param value if a value is provided, the metadata will be set to the value
 * @param cb if getting, will be provided with the value, if setting will be called upon success.
 */
Queue.prototype.metadata = function(name, value, cb) {
  if (typeof value === 'function') {
    cb = value;
    value = null;
  }

  if (value) {
    this.connection.hset(this.metadataKey, name, value, function(err, resp) {
      if (err) {
        cb && cb("error creating queue metadata: " + err);
        cb = null;
      }
    });
    this.connection.expire(this.metadataKey, this._ttl, function(err, resp) {
      if (err) {
        cb && cb("error setting metadata key expiration: " + err);
        return;
      }
      cb && cb();
    })
  } else {
    this.connection.hget(this.metadataKey, name, function(err, resp) {
      if (err) {
        cb && cb("error reading metadata " + name + ": " + err);
        return;
      }
      cb && cb(null, resp);
    });
  }
};

/**
 * Closes the queue and destroys all pending messages. No more messages can be pushed or consumed.
 * Clients attempting to attach to the queue will receive the closed event.
 * Clients currently attached to the queue will receive the closed event.
 * Events:
 *  - error - some error occurred
 *  - closed - the queue was closed
 */
Queue.prototype.close = function() {
  if (!this.isAttached()) {
    var err = 'not attached';
    this.emit('error', "error closing queue: " + err);
    return;
  }

  var _this = this;
  this.detach();

  var closes = 0;

  // delete the metadata key
  this.qKeys.forEach(function(key) {
    ++closes;
    _this._deleteKey(key, function() {
      if (--closes === 0) {
        _this.emit('closed');
      }
    });
  });
};

/**
 * Delete a key from redis
 * @private
 */
Queue.prototype._deleteKey = function(key, cb) {
  this.connection.del(key, function(err, resp) {
    if (err) {
      cb && cb("error deleting key: " + err);
    }
    cb && cb(null, resp);
  });
};

/**
 * Check if the queue exists.
 * @param cb receives true if the queue exists and false if not
 */
Queue.prototype.exists = function(cb) {
  var _this = this;
  function _exists() {
    // check if the metadata exists, as the queue itself might not contain any messages
    // meaning that it doesn't actually exist
    _this.connection.exists(_this.metadataKey, function(err, exists) {
      if (err) {
        cb && cb("error checking if queue exists: " + err);
        return;
      }
      cb && cb(null, exists === 1);
    });
  }
  this._connect(_exists);
};

/**
 * Get the number of messages in the queue
 * @param cb receives the number of messages in the queue
 */
Queue.prototype.count = function(cb) {
  this.connection.llen(this.messagesKey, function(err, count) {
    if (err) {
      cb && cb("error getting number of messages in queue: " + err);
      return;
    }
    cb && cb(null, count / 2);
  });
};


/**
 * Empty the queue, removing all messages.
 */
Queue.prototype.flush = function(cb) {
  this._deleteKey(this.messagesKey, cb);
};

/**
 * Push a message to the queue.
 * The message will remain in the queue until a consumer reads it
 * or until the queue is closed or until it expires.
 * @param message string or object
 * @param cb invoked when the push was actually performed. receives the id of the pushed message.
 * @return {boolean} returns true if the commands are successfully flushed to the kernel for immediate sending,
 *         and false if the buffer is full and the commands are queued to be sent when the buffer is ready again
 */
Queue.prototype.push = function(message, cb) {
  var _this = this;
  if (!this.isAttached()) {
    // we're not attached yet, push the message once we're attached
    this.once('_attached', function() {
      _this.push(message, cb);
    });
    return false;
  }

  if (typeof message === 'object') {
    message = JSON.stringify(message);
  }

  // push the message to the queue
  ++_this._pushed;

  // push the message
  this.connection.evalsha(this.bus._script('push'),
      4, this.metadataKey, this.messagesKey, this.messageIdKey, this.messagesToAckKey,
      message, this._ttl, this.messageAvailableChannel,
    function(err, resp) {
      if (err) {
        if (cb) {
          cb(err);
          cb = null;
        } else {
          _this.emit('error', "error pushing to queue (push): " + err);
        }
        return;
      }
      cb && cb(null, resp);
    }
  );
};

/**
 * Returns the number of messages pushed to this queue
 * @returns {number}
 */
Queue.prototype.pushed = function(cb) {
  cb && cb(null, this._pushed);
  return this._pushed;
};

/**
 * Returns the number of messages consumed by this queue
 * @returns {number}
 */
Queue.prototype.consumed = function(cb) {
  cb && cb(null, this._consumed);
  return this._consumed;
};

/**
 * Set the consuming state and emit it
 * @param state
 * @private
 */
Queue.prototype._consuming = function(state) {
  this.consuming = state;
  this.emit('consuming', state);
};

/**
 * Stop consuming messages. This will prevent further reading of messages from the queue.
 * Events:
 *  - consuming - the new consuming state, which will be false when no longer consuming
 *  - error - on some error
 */
Queue.prototype.stop = function() {
  if (!this.isConsuming()) {
    return;
  }

  this.bus._unsubscribe(this.connection, this.messageAvailableChannel, this._subscribeEvent);
  delete this._subscribeEvent;
  this._consuming(false);
};

/**
 * Returns true of this queue is consuming messages
 */
Queue.prototype.isConsuming = function(cb) {
  cb && cb(null, this.consuming);
  return this.consuming;
};

/**
 * Read a single message from the queue.
 * Will continue to read messages until there are no more messages to read.
 * @private
 */
Queue.prototype._consumeMessages = function() {
  var _this = this;

  function _take() {
    if (!_this.isConsuming()) {
      return;
    }

    _this._popping = true;

    // if consume max reached 0, stop consuming
    if (_this._consumeOptions.max === 0) {
      delete _this._consumeOptions.max;
      _this._popping = false;
      _this.stop();
      return;
    }

    if (_this._consumeOptions.remove) {
      // if we are consuming and removing, use pop
      if (_this._consumeOptions.reliable) {
        // if we are consuming in reliable mode, then make sure to keep the messages until they are acked
        _this.connection.evalsha(_this.bus._script('pop'), 2, _this.messagesKey, _this.messagesToAckKey, _this._ttl, function(err, resp) {
          _afterTake(err, resp);
        });
      } else {
        // we are not in reliable mode, no need to ack messages
        _this.connection.evalsha(_this.bus._script('pop'), 1, _this.messagesKey, _this._ttl, function(err, resp) {
          _afterTake(err, resp);
        });
      }
    } else {
      // if we are consuming and not removing, use index
      _this.connection.evalsha(_this.bus._script('index'), 1, _this.messagesKey, _this._consumeOptions.index++, function(err, resp) {
        if (err || !resp) {
          --_this._consumeOptions.index;
        }
        _afterTake(err, resp);
      });
    }

    function _afterTake(err, resp) {
      if (err) {
        _this.emit('error', 'error consuming message: ' + err);
        _this._popping = false;
        return;
      }

      if (resp) {
        var id = resp[0];
        var message = resp[1];
        ++_this._consumed;
        _this._consumeOptions.max && --_this._consumeOptions.max;
        // emit the message to the consumer
        _this.isConsuming() && _this.emit('message', message, id);
        // take another one
        _take();
      } else if (_this._messageAvailable) {
        // we received a push event to the queue while we were popping.
        // to make sure the event wasn't received between the time that
        // redis return a null message
        _this._messageAvailable = false;
        _take();
      } else {
        _this._popping = false;
      }
    }
  }
  _take();
};

/**
 * handle the event that a message was inserted into the queue
 * @param channel
 * @param message
 * @private
 */
Queue.prototype._handleQueueEvent = function(channel, message) {
  if (channel === this.messageAvailableChannel) {
    if (this._popping) {
      this._messageAvailable = true;
    } else {
      this._messageAvailable = false;
      this._consumeMessages();
    }
  }
};

/**
 * Consume messages form the queue. To stop consuming messages call Queue#stop.
 * @param options -
 *  - max - the maximum number of messages to consume. if negative or undefined, will continuously consume messages as
 *     they become available. default is undefined.
 *  - remove - indicates whether to remove read messages from the queue such that they will not be able to be read
 *     again. default is true.
 *  - reliable - indicates whether to consume messages in a reliable manner. This means that messages should be
 *     'ack'-ed in order not to consume them again in case of performing a second consume on the queue. default is
 *     true.
 *  - last - indicates the last message that was consumed. it is guaranteed that messages with id's up to last will not
 *     be consumed again. applicable only if 'reliable' is true. default is 0. Events:
 *  - consuming - the new consuming state (true), after which message events will start being fired
 *  - message - received a message from the queue
 *  - error - the queue does not exist, or some error occurred
 */
Queue.prototype.consume = function(options) {
  if (this.isConsuming()) {
    return;
  }

  var _this = this;
  if (!this.isAttached()) {
    if (!this.consumePending) {
      this.consumePending = true;
      this.once('_attached', function() {
        _this.consumePending = false;
        _this.consume(options);
      });
    }
    return;
  }

  this._consumeOptions = util._extend({remove: true, index: 0, reliable: false, last: 0}, options);

  // set he maximum number of messages to consume
  if (this._consumeOptions.max < 0) {
    delete this._consumeOptions.max;
  }

  this._consuming(true);

  // if we are consuming in reliable mode, ack all messages that need acking,
  // consume the messages that were not acked
  if (this._consumeOptions.reliable) {
    this.connection.evalsha(this.bus._script('ack'), 2, this.messagesToAckKey, this.messagesKey, this._consumeOptions.last, this._ttl, 'true', function(err, resp) {
      if (err) {
        _this.emit('error', 'error acking and restoring messages: ' + err);
      }
    });
  }

  this._subscribeEvent = function(type, channel, message) {
    switch (type) {
      case 'subscribe':
        // also immediately try to consume messages from the queue
        _this._consumeMessages();
        break;
      case 'unsubscribe':
        break;
      case 'message':
        _this._handleQueueEvent(channel, message);
        break;
    }
  };

  this.bus._subscribe(this.connection, this.messageAvailableChannel, this._subscribeEvent);
};

/**
 * Signal ack to messages up to the specified id. ignored if not consuming in reliable mode
 * @param id the message id to ack causing all previous messages to be acked as well
 * @param cb invoked when the ack is complete
 */
Queue.prototype.ack = function(id, cb) {
  if (this._consumeOptions.reliable) {
    var _this = this;
    this._consumeOptions.last = id;
    this.connection.evalsha(this.bus._script('ack'), 1, this.messagesToAckKey, this._consumeOptions.last, this._ttl, function(err, resp) {
      if (err) {
        if (cb) {
          cb(err);
        } else {
        _this.emit('error', 'error acking message id ' + id + ': ' + err);
      }
      }
    });
  }
};

/**
 * Tells the federation object which methods save state that need to be restored upon
 * reconnecting over a dropped websocket connection
 * @private
 */
Queue.prototype._federationState = function() {
  return [{save: 'attach', unsave: 'detach'}, {save: 'consume', unsave: 'stop'}];
};

exports = module.exports = Queue;
