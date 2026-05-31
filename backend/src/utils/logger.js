/**
 * Winston logger configuration
 * 
 * Environment-aware logging:
 *   - Development: Colorized, human-readable console output
 *   - Staging/Production: Structured JSON format for log aggregation
 *
 * All environments get file-based rotation transports.
 */
const winston = require("winston");
const path = require("path");

const env = process.env.NODE_ENV || "development";
const LOG_DIR = path.join(__dirname, "../../logs");

// ── Shared format components ──
const timestampFormat = winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" });
const errorsFormat = winston.format.errors({ stack: true });

// ── Development: colorized, human-readable ──
const devConsoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, correlationId, ...meta }) => {
    const cid = correlationId ? ` [${correlationId}]` : "";
    const extra = Object.keys(meta).length > 0 && meta.service === undefined
      ? ` ${JSON.stringify(meta)}`
      : "";
    return `${timestamp} [${level}]${cid}: ${message}${extra}`;
  })
);

// ── Production: structured JSON for log aggregation ──
const prodJsonFormat = winston.format.combine(
  timestampFormat,
  errorsFormat,
  winston.format.json()
);

// ── Build transports based on environment ──
function buildTransports() {
  const transports = [];

  // Console transport (always present)
  if (env === "development") {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(timestampFormat, errorsFormat, devConsoleFormat),
      })
    );
  } else {
    // Staging/Production: JSON console for container log drivers
    transports.push(
      new winston.transports.Console({
        format: prodJsonFormat,
      })
    );
  }

  // File transports (all environments)
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level: "error",
      format: prodJsonFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    })
  );

  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, "combined.log"),
      format: prodJsonFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true,
    })
  );

  // Production-only: separate access log for HTTP requests
  if (env === "production" || env === "staging") {
    transports.push(
      new winston.transports.File({
        filename: path.join(LOG_DIR, "access.log"),
        level: "http",
        format: prodJsonFormat,
        maxsize: 20 * 1024 * 1024, // 20MB
        maxFiles: 5,
        tailable: true,
      })
    );
  }

  return transports;
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (env === "development" ? "debug" : "info"),
  format: winston.format.combine(timestampFormat, errorsFormat, winston.format.json()),
  defaultMeta: {
    service: "proofsy-backend",
    environment: env,
  },
  transports: buildTransports(),
});

/**
 * Create a child logger with a correlation ID for per-request tracing.
 * Usage: const reqLogger = logger.child({ correlationId: req.correlationId });
 */
logger.createRequestLogger = (correlationId) => {
  return logger.child({ correlationId });
};

module.exports = logger;
