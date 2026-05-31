/**
 * Request Correlation ID Middleware
 * 
 * Generates a unique correlation ID for each request (or reuses an incoming one)
 * and attaches it to the request object and response headers for distributed tracing.
 */
const crypto = require("crypto");

const CORRELATION_HEADER = "x-correlation-id";

function correlationMiddleware(req, res, next) {
  // Reuse incoming correlation ID or generate a new one
  const correlationId =
    req.headers[CORRELATION_HEADER] ||
    `pfy-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;

  // Attach to request for downstream use
  req.correlationId = correlationId;

  // Set on response so clients can reference it
  res.setHeader("X-Correlation-ID", correlationId);

  next();
}

module.exports = { correlationMiddleware, CORRELATION_HEADER };
