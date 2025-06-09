const Redis = require('ioredis');
const redis = new Redis();

const BUCKET_CAPACITY = 10;      // Max burst (10 requests)
const REFILL_RATE = 10/60;      // 10 tokens per minute = 1/6 tokens per second
const TTL_SECONDS = 60 * 60;     // Redis key TTL (1 hour)

// Lua script for atomic token bucket operations
const tokenBucketScript = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refillRate = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

-- Helper function to initialize bucket
local function initBucket()
    return {
        tokens = capacity,
        lastRefill = now
    }
end

-- Get current bucket state or initialize
local tokens, lastRefill
local exists = redis.call('exists', key)
if exists == 0 then
    -- Key doesn't exist, initialize new bucket
    local bucket = initBucket()
    tokens = bucket.tokens
    lastRefill = bucket.lastRefill
else
    -- Get existing bucket data
    local bucketData = redis.call('hmget', key, 'tokens', 'lastRefill')
    tokens = tonumber(bucketData[1])
    lastRefill = tonumber(bucketData[2])
    
    if not tokens or not lastRefill then
        -- Invalid data, reinitialize
        local bucket = initBucket()
        tokens = bucket.tokens
        lastRefill = bucket.lastRefill
    else
        -- Calculate token refill
        local elapsed = (now - lastRefill) / 1000.0
        local tokensToAdd = elapsed * refillRate
        tokens = math.min(tokens + tokensToAdd, capacity)
    end
end

-- Try to consume a token
if tokens < 1 then
    -- Store current state even if we deny the request
    redis.call('hmset', key, 'tokens', tostring(tokens), 'lastRefill', tostring(now))
    redis.call('expire', key, ttl)
    return {tostring(tokens), tostring(now), 0}
end

-- Consume token and update bucket
tokens = tokens - 1
redis.call('hmset', key, 'tokens', tostring(tokens), 'lastRefill', tostring(now))
redis.call('expire', key, ttl)

return {tostring(tokens), tostring(now), 1}
`

// Load the script once
const tokenBucketSha = redis.defineCommand('tokenBucket', {
  numberOfKeys: 1,
  lua: tokenBucketScript
});

module.exports = async function rateLimiter(req, res, next) {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const key = `rate-limit:${ip}`;
    const now = Date.now();    // Execute the atomic token bucket operation    // Clear any existing data for testing
    // await redis.del(key);

    const result = await redis.tokenBucket(
      key,
      now,
      BUCKET_CAPACITY,
      REFILL_RATE,
      TTL_SECONDS
    );

    const tokens = parseFloat(result[0]);
    const lastRefill = parseInt(result[1]);
    const allowed = result[2] === 1;

    console.log(`[Debug] IP: ${ip}, Tokens: ${tokens}, Allowed: ${allowed}`);

    if (!allowed) {
      const resetSeconds = Math.ceil(1 / REFILL_RATE);
      res.set('Retry-After', resetSeconds);
      res.set('X-RateLimit-Limit', BUCKET_CAPACITY);
      res.set('X-RateLimit-Remaining', 0);
      res.set('X-RateLimit-Reset', resetSeconds);
      return res.status(429).json({ error: 'Too Many Requests' });
    }

    const tokensNeeded = BUCKET_CAPACITY - tokens;
    const resetSeconds = Math.ceil(tokensNeeded / REFILL_RATE);    // Set headers
    res.set('X-RateLimit-Limit', BUCKET_CAPACITY);
    res.set('X-RateLimit-Remaining', Math.floor(tokens));
    res.set('X-RateLimit-Reset', resetSeconds);

    next();
  } catch (err) {
    console.error('Rate limiter failed:', err);
    // Fail-open: let request through
    next();
  }
};
