// lib/redisClient.js
const Redis = require('ioredis');
require('dotenv').config(); // Load environment variables from .env file

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost', // Use the REDIS_HOST from env or default to localhost
  port: process.env.REDIS_PORT || 6379,       // Use the REDIS_PORT from env or default to 6379
});

module.exports = redisClient;
