/**
 * Environment variable validation
 * Ensures all required environment variables are set at startup.
 * Only MONGODB_URI is truly required — PORT, NODE_ENV, and REDIS_URL
 * all have working fallback defaults in the rest of the codebase.
 */
const logger = require("./logger");

// JWT_SECRET is required in every non-test environment. We never fall back to a
// hard-coded secret, otherwise an attacker who knows the default could forge tokens.
const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_SECRET",
];

const optionalEnvVars = {
  NODE_ENV: "development",
  PORT: "5000",
  REDIS_URL: "redis://localhost:6379",
};

const MIN_JWT_SECRET_LENGTH = 32;

const validateEnv = () => {
  // In test environments we provide a deterministic secret so the suite can run
  // without external configuration, but it is still a real (non-fallback) value.
  if (process.env.NODE_ENV === "test" && !process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "test_jwt_secret_test_jwt_secret_32chars";
  }

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

  // Enforce a strong JWT secret in production.
  if (
    process.env.NODE_ENV === "production" &&
    (process.env.JWT_SECRET || "").length < MIN_JWT_SECRET_LENGTH
  ) {
    logger.error(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters in production`
    );
    process.exit(1);
  }

  // Set defaults for optional vars
  for (const [key, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
      logger.info(`Using default for ${key}: ${defaultValue}`);
    }
  }

  logger.info("✓ All required environment variables are set");
};

module.exports = { validateEnv };
