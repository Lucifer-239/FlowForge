const Redis = require("ioredis");

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_URL = process.env.REDIS_URL || null;

let redisConnection = null;
let isRedisAvailable = false;
let loggedWarning = false;

// Connection options for BullMQ
const redisOptions = REDIS_URL
  ? REDIS_URL
  : {
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 1) {
          return null; // Stop reconnecting if not present
        }
        return 1000;
      },
    };

// Only attempt connecting if REDIS_URL or REDIS_ENABLED is set, or try once quietly
const shouldConnect = Boolean(REDIS_URL || process.env.REDIS_ENABLED === "true");

if (shouldConnect) {
  try {
    redisConnection = new Redis(redisOptions);

    redisConnection.on("connect", () => {
      isRedisAvailable = true;
      console.log("Redis connected successfully for BullMQ");
    });

    redisConnection.on("error", (err) => {
      isRedisAvailable = false;
      if (!loggedWarning) {
        loggedWarning = true;
        console.warn("⚠️ Redis not reachable. Background executions running in async fallback mode.");
      }
    });
  } catch (err) {
    isRedisAvailable = false;
  }
} else {
  // Graceful notification
  console.log("ℹ️ No REDIS_URL configured: BullMQ configured with asynchronous in-memory background processing.");
}

const getIsRedisAvailable = () => isRedisAvailable;

module.exports = {
  redisConnection,
  redisOptions,
  getIsRedisAvailable,
  shouldConnect,
};
