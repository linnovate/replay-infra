-- KEYS[1] - the messages queue
-- ARGV[1] - the index of the message to get

-- get a message by index
local index = tonumber(ARGV[1]) * 2
local id = redis.call('lindex',KEYS[1],index)
if not id then return nil end
local message = redis.call('lindex',KEYS[1],index+1)

-- return the id and the message
return {tonumber(id), message }
