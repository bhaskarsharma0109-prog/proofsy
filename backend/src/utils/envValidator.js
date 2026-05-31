/**
 * Environment variable validation
 * Ensures all required environment variables are set at startup.
 * Enforces stricter rules in staging and production environments.
 */
const logger = require("./logger");

const MIN_JWT_SECRET_LENGTH = 32;

// Variables required in ALL environments
const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_SECRET",
];

// Variables required ONLY in production
const productionRequiredVars = [
  "CORS_ORIGIN",
];

const optionalEnvVars = {
  NODE_ENV: "development",
  PORT: "5000",
  REDIS_URL: "redis://localhost:6379",
  STORAGE_PROVIDER: "local",
  LOG_LEVEL: "info",
  RATE_LIMIT_WINDOW_MS: "900000",
  RATE_LIMIT_MAX: "1000",
};

const validateEnv = () => {
  const env = process.env.NODE_ENV || "development";

  // In test environments we provide a deterministic secret so the suite can run
  // without external configuration, but it is still a real (non-fallback) value.
  if (env === "test" && !process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "test_jwt_secret_test_jwt_secret_32chars";
  }

  // ── Check universally required vars ──
  const missing = [];
  requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  });

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  // ── Production-specific enforcement ──
  if (env === "production") {
    const prodMissing = [];
    productionRequiredVars.forEach((envVar) => {
      if (!process.env[envVar]) {
        prodMissing.push(envVar);
      }
    });

    if (prodMissing.length > 0) {
      logger.error(`Missing PRODUCTION-required environment variables: ${prodMissing.join(", ")}`);
      process.exit(1);
    }

    // Enforce strong JWT secret in production
    if ((process.env.JWT_SECRET || "").length < MIN_JWT_SECRET_LENGTH) {
      logger.error(
        `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters in production`
      );
      process.exit(1);
    }

    // Enforce explicit CORS (not 'true' or wildcard) in production
    const corsOrigin = process.env.CORS_ORIGIN || "";
    if (corsOrigin === "true" || corsOrigin === "*" || corsOrigin === "") {
      logger.error(
        "CORS_ORIGIN must be an explicit comma-separated list of allowed origins in production (not 'true', '*', or empty)"
      );
      process.exit(1);
    }

    // Enforce cloud storage in production
    const storageProvider = process.env.STORAGE_PROVIDER || "local";
    if (storageProvider === "local") {
      logger.error(
        "STORAGE_PROVIDER must be 's3' or 'gcs' in production. Local filesystem storage is not suitable for production deployments."
      );
      process.exit(1);
    }

    // Validate S3 config if selected
    if (storageProvider === "s3") {
      if (!process.env.AWS_S3_BUCKET) {
        logger.error("AWS_S3_BUCKET is required when STORAGE_PROVIDER=s3");
        process.exit(1);
      }
      if (!process.env.AWS_REGION) {
        logger.warn("AWS_REGION not set, defaulting to 'ap-south-1'");
        process.env.AWS_REGION = "ap-south-1";
      }
    }

    // Validate GCS config if selected
    if (storageProvider === "gcs") {
      if (!process.env.GCS_BUCKET) {
        logger.error("GCS_BUCKET is required when STORAGE_PROVIDER=gcs");
        process.exit(1);
      }
    }

    // Warn if no email provider configured in production
    if (!process.env.SMTP_HOST && !process.env.SENDGRID_API_KEY) {
      logger.warn(
        "No email provider configured in production. Certificate delivery emails will fail."
      );
    }
  }

  // ── Staging warnings ──
  if (env === "staging") {
    if ((process.env.JWT_SECRET || "").length < MIN_JWT_SECRET_LENGTH) {
      logger.warn(
        `JWT_SECRET should be at least ${MIN_JWT_SECRET_LENGTH} characters in staging`
      );
    }

    const storageProvider = process.env.STORAGE_PROVIDER || "local";
    if (storageProvider === "local") {
      logger.warn(
        "STORAGE_PROVIDER is 'local' in staging. Consider using 's3' or 'gcs' to match production."
      );
    }

    if (!process.env.SMTP_HOST && !process.env.SENDGRID_API_KEY) {
      logger.warn(
        "No email provider configured in staging. Using Ethereal test transport."
      );
    }
  }

  // ── Validate STORAGE_PROVIDER value ──
  const validStorageProviders = ["local", "s3", "gcs"];
  const storageProvider = process.env.STORAGE_PROVIDER || "local";
  if (!validStorageProviders.includes(storageProvider)) {
    logger.error(
      `Invalid STORAGE_PROVIDER: '${storageProvider}'. Must be one of: ${validStorageProviders.join(", ")}`
    );
    process.exit(1);
  }

  // ── Set defaults for optional vars ──
  for (const [key, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
      logger.info(`Using default for ${key}: ${defaultValue}`);
    }
  }

  logger.info(`✓ Environment validated: ${env}`);
  logger.info(`✓ Storage provider: ${process.env.STORAGE_PROVIDER}`);
  logger.info(`✓ Log level: ${process.env.LOG_LEVEL}`);
};

module.exports = { validateEnv };
