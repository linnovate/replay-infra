-- KEYS[1] - the metadata key
-- KEYS[2] - the messages queue key
-- KEYS[3] - the messages id key
-- KEYS[4] - the message to ack key
-- ARGV[1] - the message to push
-- ARGV[2] - the ttl of the queue
-- ARGV[3] - the message available channel to publish on

-- increment the message counter
local id = redis.call('incr', KEYS[3])

-- push the id and the message
redis.call('rpush', KEYS[2], id)
redis.call('rpush', KEYS[2], ARGV[1])

-- set expiration for all keys
redis.call('expire', KEYS[1], ARGV[2])
redis.call('expire', KEYS[2], ARGV[2])
redis.call('expire', KEYS[3], ARGV[2])
redis.call('expire', KEYS[4], ARGV[2])

-- publish a new message is available
redis.call('publish', ARGV[3], id)

-- return the id
return tonumber(id)
