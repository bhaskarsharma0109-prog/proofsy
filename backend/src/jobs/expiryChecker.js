const Queue = require("bull");
const Certificate = require("../models/Certificate");
const AuditLog = require("../models/AuditLog");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

async function expireCertificates() {
  const now = new Date();
  const certificates = await Certificate.find({
    status: "generated",
    expiresAt: { $ne: null, $lt: now },
  }).select("_id workspaceId verificationCode");

  if (certificates.length === 0) {
    return { expired: 0 };
  }

  const ids = certificates.map((certificate) => certificate._id);
  await Certificate.updateMany(
    { _id: { $in: ids } },
    { $set: { status: "expired" } }
  );

  await AuditLog.insertMany(
    certificates.map((certificate) => ({
      workspaceId: certificate.workspaceId,
      actorName: "System",
      actorEmail: "system@proofsy",
      action: "certificate_expired",
      targetId: certificate._id,
      targetModel: "Certificate",
      description: `Marked certificate "${certificate.verificationCode}" as expired`,
      metadata: { expiredAt: now.toISOString() },
    }))
  );

  return { expired: certificates.length };
}

function startExpiryChecker(redisUrl = REDIS_URL) {
  const queue = new Queue("certificate-expiry", redisUrl, {
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 30,
      removeOnFail: 50,
    },
  });

  queue.process(async () => expireCertificates());

  queue.add(
    {},
    {
      jobId: "daily-certificate-expiry",
      repeat: { cron: "0 0 * * *" },
    }
  ).catch((error) => {
    console.warn("[ExpiryChecker] Failed to schedule daily job:", error.message);
  });

  queue.on("completed", (job, result) => {
    console.log(`[ExpiryChecker] Job ${job.id} completed:`, result);
  });

  queue.on("failed", (job, error) => {
    console.error(`[ExpiryChecker] Job ${job.id} failed:`, error.message);
  });

  queue.on("error", (error) => {
    console.warn("[ExpiryChecker] Redis connection error:", error.message);
  });

  return queue;
}

module.exports = { expireCertificates, startExpiryChecker };
