# ⏱ API Rate Limiter

Build a production-ready rate limiter for APIs using Redis.

## 🧰 Stack
- Node.js (Express)
- Redis

## 🧠 What I'm Learning
- Redis commands
- IP-based rate limiting
- Middlewares for Express

## 🚀 Setup Instructions

1. **Prerequisites**
   - Node.js (v14 or higher)
   - Redis server
   - Git

2. **Installation**
   ```bash
   # Clone the repository
   git clone https://github.com/DavidAdeboye/api-rate-limiter.git
   cd api-rate-limiter

   # Install dependencies
   npm install
   ```

3. **Configuration**
   - Make sure Redis server is running locally on port 6379
   - Default rate limit: 10 requests per minute
   - You can adjust the rate limits in `tokenBucket.js`:
     - `BUCKET_CAPACITY`: Maximum burst size (default: 10)
     - `REFILL_RATE`: Tokens per minute (default: 10/60)
     - `TTL_SECONDS`: Redis key TTL (default: 1 hour)

4. **Running the Server**
   ```bash
   # Start the API server
   npm start

   # Run the spam test (in a separate terminal)
   node spam-test.js
   ```

## 📝 API Endpoints
- `GET /` - Test endpoint (rate-limited)
- `POST /reset-limit` - Reset rate limit for testing

## ✅ Roadmap
- [ ] Setup Node.js + Redis
- [ ] Basic token bucket logic
- [ ] IP limiting middleware
- [ ] Burst prevention
- [ ] Dockerize

## 🕓 Progress Log
- TBD
