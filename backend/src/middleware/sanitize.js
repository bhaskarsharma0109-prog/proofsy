/**
 * Custom sanitization middleware — Express 5 compatible.
 * Replaces express-mongo-sanitize, xss-clean, and hpp.
 * Zero external dependencies.
 */

/**
 * Recursively strip keys starting with '$' or containing '.'
 * from an object to prevent NoSQL injection attacks.
 */
function stripDangerousKeys(obj) {
  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(stripDangerousKeys);
  }

  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      continue; // Strip dangerous keys silently
    }
    clean[key] = stripDangerousKeys(obj[key]);
  }
  return clean;
}

/**
 * Recursively HTML-encode dangerous characters in string values
 * to prevent XSS attacks.
 */
function escapeHtml(obj) {
  if (typeof obj === "string") {
    return obj
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }

  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(escapeHtml);
  }

  const clean = {};
  for (const key of Object.keys(obj)) {
    clean[key] = escapeHtml(obj[key]);
  }
  return clean;
}

/**
 * Remove duplicate query parameters (HTTP Parameter Pollution protection).
 * If a query param appears multiple times, keep only the last value.
 */
function deduplicateParams(obj) {
  if (obj === null || typeof obj !== "object") return obj;

  const clean = {};
  for (const key of Object.keys(obj)) {
    if (Array.isArray(obj[key])) {
      clean[key] = obj[key][obj[key].length - 1];
    } else {
      clean[key] = obj[key];
    }
  }
  return clean;
}

/**
 * Express middleware: sanitizes req.body, req.query, and req.params.
 * - Strips NoSQL injection keys ($gt, $ne, etc.)
 * - HTML-encodes strings to prevent stored XSS
 * - Deduplicates query params to prevent HPP
 */
function sanitize(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = escapeHtml(stripDangerousKeys(req.body));
  }

  // Only sanitize query keys (don't HTML-encode query values — they're usually
  // used for filtering/searching and encoding would break lookups)
  if (req.query && typeof req.query === "object") {
    req.query = deduplicateParams(stripDangerousKeys(req.query));
  }

  if (req.params && typeof req.params === "object") {
    req.params = stripDangerousKeys(req.params);
  }

  next();
}

module.exports = { sanitize, stripDangerousKeys, escapeHtml, deduplicateParams };
