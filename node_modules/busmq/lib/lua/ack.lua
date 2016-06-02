-- KEYS[1] - the 'waiting for ack' queue
-- KEYS[2] - the messages queue
-- ARGV[1] - the last message id that was acked
-- ARGV[2] - keys ttl
-- ARGV[3] - 'true' means to restore un-acked messages back to the messages queue

-- continously pop messages up to the last acked message and discard the acked ones
local lastack = tonumber(ARGV[1])
local cont = true
while cont do
    local id = redis.call('lpop',KEYS[1])
    if not id then return end  -- if the are no more messages in the 'waiting for ack' queue we're done
    if lastack >= tonumber(id) then
        -- the current message id is acked, so we can remove the message
        redis.call('lpop',KEYS[1])
    else
        -- the current message id is not yet acked, put the id back to the queue
        redis.call('lpush',KEYS[1], id)
        redis.call('expire', KEYS[1], ARGV[2])
        cont = false  -- break out from the loop
    end
end

-- if we want to restore all the un-acked messages back to the messages queue, then
-- we pop the messages from the end of the 'waiting for ack' queue and push them the head of the messages queue
-- so that they can be consumed once again
if ARGV[3] == 'true' then
    while true do
        -- pop the next last element from the 'waiting for ack' queue
        local element = redis.call('rpop',KEYS[1])
        if not element then break end
        -- push it to the head of messages queue
        redis.call('lpush',KEYS[2], element)
        redis.call('expire', KEYS[2], ARGV[2])
    end
end

return redis.status_reply('OK')
