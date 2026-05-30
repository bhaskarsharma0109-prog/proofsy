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

async function boot() {
  // Connect to MongoDB
  await mongoose.connect(MONGODB_URI);
  console.log("[Worker] Connected to MongoDB");

  // Require the generation logic *after* Mongoose is connected so models work
  const { queueCertificateGeneration } = require("./workers/certificateWorker");

  // Process jobs — concurrency of 2 keeps memory sane on a single VM
  certQueue.process(2, async (job) => {
    const { eventId } = job.data;
    console.log(`[Worker] Processing job ${job.id} for event ${eventId}`);
    const result = await queueCertificateGeneration(eventId);
    console.log(`[Worker] Job ${job.id} complete`, result);
    return result;
  });

  certQueue.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job.id} failed:`, err.message);
  });

  console.log("[Worker] Listening for certificate-generation jobs…");
}

boot().catch((err) => {
  console.error("[Worker] Fatal:", err);
  process.exit(1);
});
