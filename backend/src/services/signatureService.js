const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const KEY_PATH = path.join(__dirname, "../../../proofsy_key.pem");

let privateKeyPem = null;
let publicKeyPem = null;

/**
 * Initialize keypair. Load existing proofsy_key.pem or generate a transient fallback keypair.
 */
function initKeys() {
  if (privateKeyPem && publicKeyPem) return;

  try {
    if (fs.existsSync(KEY_PATH)) {
      privateKeyPem = fs.readFileSync(KEY_PATH, "utf8");
      
      // Derive public key from the loaded private key
      const keyObj = crypto.createPublicKey({
        key: privateKeyPem,
        format: "pem"
      });
      publicKeyPem = keyObj.export({ type: "spki", format: "pem" });
      
      console.log("[SignatureService] Successfully loaded RSA key from proofsy_key.pem");
      return;
    }
  } catch (err) {
    console.error("[SignatureService] Failed to load key file, generating fallback...", err);
  }

  // Fallback: Generate a strong RSA 2048-bit keypair dynamically for this session
  try {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem"
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem"
      }
    });
    
    privateKeyPem = privateKey;
    publicKeyPem = publicKey;
    console.log("[SignatureService] Generated transient 2048-bit RSA keypair fallback successfully");
  } catch (err) {
    console.error("[SignatureService] Critical error generating fallback keypair:", err);
    throw err;
  }
}

/**
 * Deterministically stringifies a payload object for consistent signatures
 */
function serializePayload(data) {
  if (!data) return "";
  
  // Sort keys deterministically to avoid hash mismatches due to object key ordering
  const sorted = {};
  Object.keys(data).sort().forEach((key) => {
    sorted[key] = data[key];
  });
  return JSON.stringify(sorted);
}

/**
 * Sign data object using private key and SHA-256
 * @param {Object} data 
 * @returns {string} Base64 encoded signature
 */
function signCertificateData(data) {
  initKeys();
  const serialized = serializePayload(data);
  const sign = crypto.createSign("SHA256");
  sign.update(serialized);
  sign.end();
  return sign.sign(privateKeyPem, "base64");
}

/**
 * Verify base64 signature against data object using public key and SHA-256
 * @param {Object} data 
 * @param {string} signature Base64 encoded signature
 * @returns {boolean}
 */
function verifyCertificateSignature(data, signature) {
  if (!signature) return false;
  initKeys();
  
  try {
    const serialized = serializePayload(data);
    const verify = crypto.createVerify("SHA256");
    verify.update(serialized);
    verify.end();
    return verify.verify(publicKeyPem, signature, "base64");
  } catch (err) {
    console.error("[SignatureService] Verification error:", err.message);
    return false;
  }
}

/**
 * Returns the public key in PEM format
 * @returns {string}
 */
function getPublicKeyPem() {
  initKeys();
  return publicKeyPem;
}

module.exports = {
  signCertificateData,
  verifyCertificateSignature,
  getPublicKeyPem
};
