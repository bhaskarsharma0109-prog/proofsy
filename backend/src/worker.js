/**
 * Standalone worker process.
 *
 * This runs as a separate container (or process) that listens to the
 * "certificate-generation" Bull queue backed by Redis and generates
 * certificate PDFs using Puppeteer.
 *
 * Usage:  node src/worker.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Queue = require("bull");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const MONGODB_URI = process.env.MONGODB_URI;

// Create the queue (must match the name used in the API server)
const certQueue = new Queue("certificate-generation", REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

const { ensureStarterTemplates } = require("./utils/templateSetup");
const storageService = require("./services/storageService");
const { startExpiryChecker } = require("./jobs/expiryChecker");

let isShuttingDown = false;
let expiryQueue = null;

async function boot() {
  // Ensure starter templates exist in runtime volume
  ensureStarterTemplates();

  // Connect to MongoDB
  await mongoose.connect(MONGODB_URI);
  console.log("[Worker] Connected to MongoDB");

  // Log environment info
  console.log(`[Worker] Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`[Worker] Storage provider: ${storageService.getProvider()}`);
  console.log(`[Worker] Redis URL: ${REDIS_URL}`);

  // Require the generation logic *after* Mongoose is connected so models work
  const { queueCertificateGeneration } = require("./workers/certificateWorker");
  expiryQueue = startExpiryChecker(REDIS_URL);

  // Process jobs — concurrency of 2 keeps memory sane on a single VM
  certQueue.process(2, async (job) => {
    if (isShuttingDown) {
      throw new Error("Worker is shutting down, job will be retried");
    }
    const { eventId } = job.data;
    console.log(`[Worker] Processing job ${job.id} for event ${eventId}`);
    const result = await queueCertificateGeneration(eventId);
    console.log(`[Worker] Job ${job.id} complete`, result);
    return result;
  });

  certQueue.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job.id} failed:`, err.message);
  });

  certQueue.on("completed", (job, result) => {
    console.log(`[Worker] Job ${job.id} completed successfully:`, result);
  });

  console.log("[Worker] Listening for certificate-generation jobs…");
}

// Graceful shutdown — stop accepting new jobs, wait for active ones
const WORKER_SHUTDOWN_TIMEOUT = 60000; // 60 seconds for active jobs to finish

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`[Worker] ${signal} received. Shutting down gracefully (${WORKER_SHUTDOWN_TIMEOUT / 1000}s timeout)...`);

  const forceTimer = setTimeout(() => {
    console.error("[Worker] Shutdown timed out. Forcing exit.");
    process.exit(1);
  }, WORKER_SHUTDOWN_TIMEOUT);
  forceTimer.unref();

  try {
    // Pause the queue — stops picking up new jobs but lets active ones finish
    await certQueue.pause(true); // true = pause locally only
    console.log("[Worker] ✓ Queue paused (no new jobs will be picked up)");

    // Wait for active jobs to finish
    const activeCount = await certQueue.getActiveCount();
    if (activeCount > 0) {
      console.log(`[Worker] Waiting for ${activeCount} active job(s) to complete...`);
      // Poll until active jobs finish or timeout
      await new Promise((resolve) => {
        const interval = setInterval(async () => {
          const remaining = await certQueue.getActiveCount();
          if (remaining === 0) {
            clearInterval(interval);
            resolve();
          }
        }, 2000);
      });
    }

    // Close the queue connection
    await certQueue.close();
    console.log("[Worker] ✓ Queue closed");

    if (expiryQueue) {
      await expiryQueue.close();
      console.log("[Worker] Expiry queue closed");
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("[Worker] ✓ MongoDB disconnected");
  } catch (err) {
    console.error("[Worker] Error during shutdown:", err.message);
  }

  clearTimeout(forceTimer);
  console.log("[Worker] ✓ Graceful shutdown complete");
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

boot().catch((err) => {
  console.error("[Worker] Fatal:", err);
  process.exit(1);
});
