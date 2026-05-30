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
const morgan = require("morgan");

const logger = require("./utils/logger");
const { errorHandler } = require("./middleware/errorHandler");
const { validateEnv } = require("./utils/envValidator");
const { closeCertificateQueue } = require("./services/certificateQueue");

// Validate environment variables
validateEnv();

const app = express();
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

// Request limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 1000,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// Stricter limiter for authentication endpoints to slow brute-force attacks.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 100,
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Performance middleware
app.use(cookieParser());
app.use(compression());

// Body parsing MUST run before sanitization so that req.body is populated when
// the sanitizer strips dangerous NoSQL operators / HTML from request payloads.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(sanitize);

// Request logging
app.use(morgan("dev", {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Serve generated PDFs
app.use("/storage", express.static(path.join(__dirname, "../storage")));

// Routes
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/events", require("./routes/events"));
app.use("/api/certificates", require("./routes/certificates"));
app.use("/api/users", require("./routes/users"));
app.use("/api/verify", require("./routes/verify"));
app.use("/api/templates", require("./routes/templates"));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    },
  });
});

// Liveness check (Kubernetes)
app.get("/api/live", (req, res) => {
  res.json({ status: "alive" });
});

// Readiness check (Kubernetes)
app.get("/api/ready", async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.json({ status: "ready" });
  } else {
    res.status(503).json({ status: "not ready" });
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

async function startServer() {
  let mongoUri = process.env.MONGODB_URI;

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 5,
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

  server = app.listen(PORT, () => {
    logger.info(
      `✓ Proofsy backend running on http://localhost:${PORT}`
    );
    logger.info(`Environment: ${process.env.NODE_ENV}`);
  });
}

// Graceful shutdown handling
async function gracefulShutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close();
  }
  await closeCertificateQueue();
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
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
