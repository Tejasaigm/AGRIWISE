/**
 * Redis client (ioredis) – Production Ready
 */

const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true, // connect only when needed
  retryStrategy: (times) => {
    if (times > 10) return null; // stop retrying after 10 attempts
    return Math.min(times * 200, 3000);
  },
});

// 🔹 Connect manually (better control)
async function connectRedis() {
  try {
    if (!redisClient.status || redisClient.status === 'end') {
      await redisClient.connect();
    }
    console.log('[Redis] connected');
  } catch (err) {
    console.error('[Redis] connection failed:', err.message);
  }
}

// 🔹 Events
redisClient.on('error', (err) => {
  console.error('[Redis] error:', err.message);
});

redisClient.on('reconnecting', () => {
  console.warn('[Redis] reconnecting...');
});

redisClient.on('end', () => {
  console.warn('[Redis] connection closed');
});

module.exports = { redisClient, connectRedis };