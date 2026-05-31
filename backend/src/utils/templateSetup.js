const fs = require("fs");
const path = require("path");
const logger = require("./logger");

const ASSETS_TEMPLATES_DIR = path.join(__dirname, "../assets/templates");
const RUNTIME_TEMPLATES_DIR = path.join(__dirname, "../../storage/templates");

function ensureStarterTemplates() {
  try {
    // 1. Ensure runtime templates directory exists
    if (!fs.existsSync(RUNTIME_TEMPLATES_DIR)) {
      fs.mkdirSync(RUNTIME_TEMPLATES_DIR, { recursive: true });
      logger.info(`[Templates] Created runtime templates directory: ${RUNTIME_TEMPLATES_DIR}`);
    }

    // 2. Check and copy files
    if (fs.existsSync(ASSETS_TEMPLATES_DIR)) {
      const files = fs.readdirSync(ASSETS_TEMPLATES_DIR);
      logger.info(`[Templates] Synchronizing ${files.length} starter templates from assets...`);
      
      let copiedCount = 0;
      files.forEach((file) => {
        const sourcePath = path.join(ASSETS_TEMPLATES_DIR, file);
        const destPath = path.join(RUNTIME_TEMPLATES_DIR, file);

        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(sourcePath, destPath);
          copiedCount++;
        }
      });
      if (copiedCount > 0) {
        logger.info(`[Templates] Copied ${copiedCount} new starter templates to runtime storage.`);
      } else {
        logger.info("[Templates] Starter templates are already synchronized.");
      }
    } else {
      logger.warn(`[Templates] Source assets folder not found at ${ASSETS_TEMPLATES_DIR}. Skipping sync.`);
    }
  } catch (err) {
    logger.error("[Templates] Error initializing starter templates:", err.message);
  }
}

module.exports = { ensureStarterTemplates };
