/**
 * Environment variable validation
 * Ensures all required environment variables are set at startup
 */
const logger = require("./logger");

const requiredEnvVars = [
  "MONGODB_URI",
  "REDIS_URL",
  "NODE_ENV",
  "PORT",
];

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

  logger.info("✓ All required environment variables are set");
};

module.exports = { validateEnv };
