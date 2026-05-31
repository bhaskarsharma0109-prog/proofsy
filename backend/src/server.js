require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const path = require("path");
// Custom Express 5-compatible security middleware (replaces express-mongo-sanitize, xss-clean, hpp)
const { sanitize } = require("./middleware/sanitize");
const { correlationMiddleware } = require("./middleware/correlationMiddleware");
const morgan = require("morgan");

const logger = require("./utils/logger");
const { errorHandler } = require("./middleware/errorHandler");
const { validateEnv } = require("./utils/envValidator");
const { closeCertificateQueue } = require("./services/certificateQueue");
const storageService = require("./services/storageService");

// Validate environment variables
validateEnv();

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS: use an explicit allowlist of origins. The previous behaviour treated a
// raw `CORS_ORIGIN=true` string as a literal origin and fell back to `true`
// (reflecting any origin) when unset. We now parse a comma-separated allowlist
// and ignore meaningless values like "true"/"false".
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter((o) => o && o !== "true" && o !== "false");

app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin / non-browser requests (no Origin header).
      if (!origin) return cb(null, true);
      // If no allowlist configured, allow all in non-production for local dev.
      if (allowedOrigins.length === 0) {
        if (process.env.NODE_ENV === "production") {
          return cb(new Error("Origin not allowed by CORS"));
        }
        return cb(null, true);
      }
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);

// Request limiting — configurable via env vars
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX, 10) || (process.env.NODE_ENV === "production" ? 100 : 1000);
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX,
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// Stricter limiter for authentication endpoints to slow brute-force attacks.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 100 : 100,
  message: { error: "Too many authentication attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Correlation ID middleware — must be early to tag all downstream logs
app.use(correlationMiddleware);

// Performance middleware
app.use(cookieParser());
app.use(compression());

// Body parsing MUST run before sanitization so that req.body is populated when
// the sanitizer strips dangerous NoSQL operators / HTML from request payloads.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(sanitize);

// Request logging — structured JSON in production, human-readable in dev
if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging") {
  // Structured JSON access log for production log aggregation
  morgan.token("correlation-id", (req) => req.correlationId || "-");
  app.use(morgan(
    '{"method":":method","url":":url","status"::status,"responseTime"::response-time,"contentLength":":res[content-length]","correlationId":":correlation-id"}',
    { stream: { write: (message) => logger.info(message.trim()) } }
  ));
} else {
  app.use(morgan("dev", {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// Serve generated files from local filesystem only when using local storage.
// When using S3/GCS, certificate URLs point directly to cloud storage.
if (storageService.getProvider() === "local") {
  app.use("/storage", express.static(path.join(__dirname, "../storage")));
  logger.info("✓ Static /storage route mounted (local filesystem mode)");
} else {
  logger.info(`✓ Storage served via cloud provider: ${storageService.getProvider()}`);
}

// Routes
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/events", require("./routes/events"));
app.use("/api/certificates", require("./routes/certificates"));
app.use("/api/users", require("./routes/users"));
app.use("/api/verify", require("./routes/verify"));
app.use("/api/templates", require("./routes/templates"));
app.use("/api/workspaces", require("./routes/workspaces"));
app.use("/api/billing", require("./routes/billing"));
app.use("/api/integrations", require("./routes/integrations"));
app.use("/api/custom-fonts", require("./routes/customFonts"));
app.use("/api/audit-logs", require("./routes/auditLogs"));
app.use("/api/v1", require("./routes/v1"));

// Health check endpoint — detailed system status
app.get("/api/health", async (req, res) => {
  const memUsage = process.memoryUsage();
  let storageHealth = { provider: storageService.getProvider(), status: "unknown" };
  try {
    storageHealth = await storageService.healthCheck();
  } catch (err) {
    storageHealth = { provider: storageService.getProvider(), status: "error", error: err.message };
  }

  const mongoState = ["disconnected", "connected", "connecting", "disconnecting"];

  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || "1.0.0",
      services: {
        mongodb: mongoState[mongoose.connection.readyState] || "unknown",
        storage: storageHealth,
      },
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      },
    },
  });
});

// Liveness check (Kubernetes)
app.get("/api/live", (req, res) => {
  res.json({ status: "alive" });
});

// Readiness check (Kubernetes) — checks all dependencies
app.get("/api/ready", async (req, res) => {
  const checks = {
    mongodb: mongoose.connection.readyState === 1,
  };

  // Check storage provider connectivity
  try {
    const storageHealth = await storageService.healthCheck();
    checks.storage = storageHealth.status === "ok";
  } catch {
    checks.storage = false;
  }

  const allReady = Object.values(checks).every(Boolean);
  if (allReady) {
    res.json({ status: "ready", checks });
  } else {
    res.status(503).json({ status: "not ready", checks });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Global error handler
app.use(errorHandler);

// Connect to MongoDB and start server
let mongod = null;
let server = null;

const { ensureStarterTemplates } = require("./utils/templateSetup");

async function startServer() {
  // Ensure starter templates exist in runtime volume
  ensureStarterTemplates();

  let mongoUri = process.env.MONGODB_URI;

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 2000,
    });
    logger.info("✓ Connected to MongoDB: " + mongoUri);
  } catch (err) {
    // Only allow in-memory fallback in development or test
    if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
      logger.warn(
        "Local MongoDB not available, starting in-memory MongoDB for development..."
      );
      const { MongoMemoryServer } = require("mongodb-memory-server");
      mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      await mongoose.connect(mongoUri);
      logger.info("✓ Connected to in-memory MongoDB: " + mongoUri);
    } else {
      logger.error("Failed to connect to MongoDB. Exiting...");
      process.exit(1);
    }
  }

  server = app.listen(PORT, "0.0.0.0", () => {
    logger.info(
      `✓ Proofsy backend running on http://localhost:${PORT}`
    );
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Storage provider: ${storageService.getProvider()}`);
    logger.info(`Rate limit: ${RATE_LIMIT_MAX} req/${RATE_LIMIT_WINDOW / 1000}s`);
  });
}

// Graceful shutdown handling with connection drain timeout
const SHUTDOWN_TIMEOUT_MS = 30000; // 30 seconds to drain in-flight requests

async function gracefulShutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully (${SHUTDOWN_TIMEOUT_MS / 1000}s drain timeout)...`);

  // Force exit after timeout if drain takes too long
  const forceTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref(); // Don't keep process alive just for the timer

  // 1. Stop accepting new connections
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    logger.info("✓ HTTP server closed");
  }

  // 2. Close the Bull queue (stop processing new jobs)
  try {
    await closeCertificateQueue();
    logger.info("✓ Certificate queue closed");
  } catch (err) {
    logger.error("Failed to close certificate queue:", err.message);
  }

  // 3. Disconnect from MongoDB
  try {
    await mongoose.disconnect();
    logger.info("✓ MongoDB disconnected");
  } catch (err) {
    logger.error("Failed to disconnect MongoDB:", err.message);
  }

  // 4. Stop in-memory MongoDB if running
  if (mongod) {
    await mongod.stop();
    logger.info("✓ In-memory MongoDB stopped");
  }

  clearTimeout(forceTimer);
  logger.info("✓ Graceful shutdown complete");
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

if (require.main === module) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}

module.exports = app;
