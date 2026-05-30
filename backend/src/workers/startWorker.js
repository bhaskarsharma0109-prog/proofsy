/**
 * Bull Queue Worker — consumes certificate generation jobs from Redis.
 * Run alongside the backend: node src/workers/startWorker.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const Queue = require("bull");
const { queueCertificateGeneration } = require("./certificateWorker");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/proofsy";

async function start() {
  // Connect to MongoDB
  await mongoose.connect(MONGODB_URI);
  console.log("[Worker] ✓ Connected to MongoDB");

  // Create queue consumer
  const certQueue = new Queue("certificate-generation", REDIS_URL);
  console.log("[Worker] ✓ Connected to Redis, waiting for jobs...");

  certQueue.process(async (job) => {
    const { eventId } = job.data;
    console.log(`[Worker] Processing certificate generation for event: ${eventId}`);
    const result = await queueCertificateGeneration(eventId);
    console.log(`[Worker] Done — Success: ${result.success}, Failed: ${result.failed}`);
    return result;
  });

  certQueue.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job.id} failed:`, err.message);
  });

  certQueue.on("completed", (job, result) => {
    console.log(`[Worker] Job ${job.id} completed:`, result);
  });
}

start().catch((err) => {
  console.error("[Worker] Failed to start:", err);
  process.exit(1);
});
