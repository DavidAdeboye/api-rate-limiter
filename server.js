const express = require('express');
const app = express();
const rateLimiter = require('./tokenBucket');
const Redis = require('ioredis');
const redis = new Redis();

app.use(rateLimiter);

app.get('/', (req, res) => {
  res.json({ message: 'Request successful!' });
});

// Reset rate limit (for testing)
app.delete('/reset-limit', async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const key = `rate-limit:${ip}`;
  await redis.del(key);
  res.json({ message: 'Rate limit reset' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
