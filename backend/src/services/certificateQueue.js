const Queue = require("bull");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let certQueue;

function getCertificateQueue() {
  if (!certQueue) {
    // If REDIS_URL is explicitly set to empty or placeholder, or if we want to fail fast
    certQueue = new Queue("certificate-generation", REDIS_URL, {
      redis: {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 1000,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    certQueue.on("error", (err) => {
      // Catch and log the connection error to prevent unhandled rejection/crashing
      console.warn("[Queue] Redis connection error, using local queue fallback:", err.message);
    });
  }
  return certQueue;
}

async function closeCertificateQueue() {
  if (certQueue) {
    try {
      await certQueue.close();
    } catch (err) {
      // Ignore errors on close
    }
  }
}

module.exports = { getCertificateQueue, closeCertificateQueue };
