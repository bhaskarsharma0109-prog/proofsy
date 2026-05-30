/**
 * Environment variable validation
 * Ensures all required environment variables are set at startup.
 * Only MONGODB_URI is truly required — PORT, NODE_ENV, and REDIS_URL
 * all have working fallback defaults in the rest of the codebase.
 */
const logger = require("./logger");

const requiredEnvVars = [
  "MONGODB_URI",
];

const optionalEnvVars = {
  NODE_ENV: "development",
  PORT: "5000",
  REDIS_URL: "redis://localhost:6379",
};

const validateEnv = () => {
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
