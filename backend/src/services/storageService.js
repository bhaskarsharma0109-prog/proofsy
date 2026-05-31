/**
 * Unified Storage Service for Proofsy
 * 
 * Provides a single API for file storage across three backends:
 *   - local: Filesystem (development default)
 *   - s3:    AWS S3 (production recommended)
 *   - gcs:   Google Cloud Storage (alternative)
 *
 * Provider selection is controlled by the STORAGE_PROVIDER env var.
 * Cloud SDKs are loaded lazily — no install needed for local dev.
 */
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

const STORAGE_BASE = path.join(__dirname, "../../storage");
const PROVIDER = (process.env.STORAGE_PROVIDER || "local").toLowerCase();

// ── Lazy SDK loaders ──
let _s3Client = null;
let _gcsClient = null;

function getS3Client() {
  if (_s3Client) return _s3Client;
  try {
    const { S3Client } = require("@aws-sdk/client-s3");
    _s3Client = new S3Client({
      region: process.env.AWS_REGION || "ap-south-1",
      ...(process.env.AWS_ACCESS_KEY_ID && {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }),
    });
    logger.info("[Storage] AWS S3 client initialized");
    return _s3Client;
  } catch (err) {
    logger.error("[Storage] Failed to load @aws-sdk/client-s3. Install it: npm i @aws-sdk/client-s3");
    throw new Error("AWS S3 SDK not installed. Run: npm install @aws-sdk/client-s3");
  }
}

function getGCSBucket() {
  if (_gcsClient) return _gcsClient;
  try {
    const { Storage } = require("@google-cloud/storage");
    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
    });
    _gcsClient = storage.bucket(process.env.GCS_BUCKET);
    logger.info(`[Storage] GCS bucket initialized: ${process.env.GCS_BUCKET}`);
    return _gcsClient;
  } catch (err) {
    logger.error("[Storage] Failed to load @google-cloud/storage. Install it: npm i @google-cloud/storage");
    throw new Error("GCS SDK not installed. Run: npm install @google-cloud/storage");
  }
}

// ── Local filesystem adapter ──
const localAdapter = {
  async uploadFile(buffer, key, contentType) {
    const filePath = path.join(STORAGE_BASE, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, buffer);
    return `/storage/${key}`;
  },

  getPublicUrl(key) {
    return `/storage/${key}`;
  },

  async deleteFile(key) {
    const filePath = path.join(STORAGE_BASE, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  },

  async healthCheck() {
    const exists = fs.existsSync(STORAGE_BASE);
    if (!exists) {
      fs.mkdirSync(STORAGE_BASE, { recursive: true });
    }
    return { provider: "local", status: "ok", path: STORAGE_BASE };
  },
};

// ── AWS S3 adapter ──
const s3Adapter = {
  async uploadFile(buffer, key, contentType) {
    const { PutObjectCommand } = require("@aws-sdk/client-s3");
    const client = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    // Return the public URL
    const region = process.env.AWS_REGION || "ap-south-1";
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  },

  getPublicUrl(key) {
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION || "ap-south-1";
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  },

  async deleteFile(key) {
    const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
    const client = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET;

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
  },

  async healthCheck() {
    try {
      const { HeadBucketCommand } = require("@aws-sdk/client-s3");
      const client = getS3Client();
      const bucket = process.env.AWS_S3_BUCKET;
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return { provider: "s3", status: "ok", bucket };
    } catch (err) {
      return { provider: "s3", status: "error", error: err.message };
    }
  },
};

// ── Google Cloud Storage adapter ──
const gcsAdapter = {
  async uploadFile(buffer, key, contentType) {
    const bucket = getGCSBucket();
    const file = bucket.file(key);

    await file.save(buffer, {
      contentType,
      resumable: false,
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });

    // Make public
    await file.makePublic();
    return `https://storage.googleapis.com/${process.env.GCS_BUCKET}/${key}`;
  },

  getPublicUrl(key) {
    return `https://storage.googleapis.com/${process.env.GCS_BUCKET}/${key}`;
  },

  async deleteFile(key) {
    const bucket = getGCSBucket();
    await bucket.file(key).delete({ ignoreNotFound: true });
  },

  async healthCheck() {
    try {
      const bucket = getGCSBucket();
      await bucket.exists();
      return { provider: "gcs", status: "ok", bucket: process.env.GCS_BUCKET };
    } catch (err) {
      return { provider: "gcs", status: "error", error: err.message };
    }
  },
};

// ── Provider selection ──
function getAdapter() {
  switch (PROVIDER) {
    case "s3":
      return s3Adapter;
    case "gcs":
      return gcsAdapter;
    case "local":
    default:
      return localAdapter;
  }
}

const adapter = getAdapter();

module.exports = {
  /**
   * Upload a file buffer to storage.
   * @param {Buffer} buffer - File content
   * @param {string} key - Storage key (e.g., "pdfs/CERT-ABC123.pdf")
   * @param {string} contentType - MIME type (e.g., "application/pdf")
   * @returns {Promise<string>} Public URL of the uploaded file
   */
  uploadFile: (buffer, key, contentType) => adapter.uploadFile(buffer, key, contentType),

  /**
   * Get the public URL for a storage key.
   * @param {string} key - Storage key
   * @returns {string} Public URL
   */
  getPublicUrl: (key) => adapter.getPublicUrl(key),

  /**
   * Delete a file from storage.
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  deleteFile: (key) => adapter.deleteFile(key),

  /**
   * Check storage health.
   * @returns {Promise<Object>} Health status object
   */
  healthCheck: () => adapter.healthCheck(),

  /**
   * Get the current provider name.
   * @returns {string} Provider name ("local", "s3", or "gcs")
   */
  getProvider: () => PROVIDER,
};
