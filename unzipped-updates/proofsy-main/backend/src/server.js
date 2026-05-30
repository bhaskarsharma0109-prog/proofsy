require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const morgan = require("morgan");

const logger = require("./utils/logger");
const { errorHandler } = require("./middleware/errorHandler");
const { validateEnv } = require("./utils/envValidator");

// Validate environment variables
validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
    credentials: true,
  })
);
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Request limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// Performance middleware
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use(morgan("dev", {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Serve generated PDFs
app.use("/storage", express.static(path.join(__dirname, "../storage")));

// Routes
app.use("/api/events", require("./routes/events"));
app.use("/api/certificates", require("./routes/certificates"));
app.use("/api/users", require("./routes/users"));
app.use("/api/verify", require("./routes/verify"));

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
    if (process.env.NODE_ENV === "production") {
      logger.error("Failed to connect to MongoDB in production. Exiting...");
      process.exit(1);
    }
    logger.warn(
      "Local MongoDB not available, starting in-memory MongoDB for development..."
    );
    const { MongoMemoryServer } = require("mongodb-memory-server");
    mongod = await MongoMemoryServer.create();
    mongoUri = mongod.getUri();
    await mongoose.connect(mongoUri);
    logger.info("✓ Connected to in-memory MongoDB: " + mongoUri);
  }

  server = app.listen(PORT, () => {
    logger.info(
      `✓ Proofsy backend running on http://localhost:${PORT}`
    );
    logger.info(`Environment: ${process.env.NODE_ENV}`);
  });
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  if (server) {
    server.close();
  }
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  if (server) {
    server.close();
  }
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
  process.exit(0);
});

if (require.main === module) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}

module.exports = app;
