"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { PDFDocument } from "pdf-lib";
import { api, BACKEND_URL } from "@/lib/api";
import { fadeUp, float, pulseGlow } from "@/lib/animations";
import { trackOnboarding } from "@/lib/onboarding";

// Helper: Convert PEM string to ArrayBuffer for browser Web Crypto
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = window.atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper: Deterministically stringify object for signature validation
function serializePayload(data: any): string {
  if (!data) return "";
  const sorted: any = {};
  Object.keys(data).sort().forEach((key) => {
    sorted[key] = data[key];
  });
  return JSON.stringify(sorted);
}

export default function VerificationPage({ initialCode = "" }: { initialCode?: string }) {
  // Tab configuration
  const [activeTab, setActiveTab] = useState<"code" | "file">("code");

  // Code verification states
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");

  // Dynamic shared certificate data state
  const [certData, setCertData] = useState<{
    recipientName: string;
    eventName: string;
    eventDate: string | null;
    issuedAt: string;
    pdfUrl: string | null;
    pngUrl?: string | null;
    svgUrl?: string | null;
    cryptographicSignature: string | null;
    isCryptographicallyVerified: boolean;
  } | null>(null);

  // File verification states
  const [file, setFile] = useState<File | null>(null);
  const [fileStatus, setFileStatus] = useState<"idle" | "loading" | "valid" | "invalid" | "unsupported">("idle");
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [publicKeyPem, setPublicKeyPem] = useState<string | null>(null);

  // Pre-load RSA verification public key on page mount
  useEffect(() => {
    async function fetchKey() {
      try {
        const res = await api.getPublicKey();
        if (res.success && res.data?.publicKey) {
          setPublicKeyPem(res.data.publicKey);
        }
      } catch (err) {
        console.error("Failed to load public verification key:", err);
      }
    }
    void fetchKey();
  }, []);

  // Handle incoming verification code via URL slug
  useEffect(() => {
    async function verifyIncomingCode() {
      if (!initialCode) return;
      setActiveTab("code");
      setStatus("loading");
      setCertData(null);

      const res = await api.verifyCertificate(initialCode.trim());

      if (res.success && res.data?.isValid) {
        setCertData(res.data.certificate);
        setStatus("valid");
        trackOnboarding("verifiedCertificate");
      } else {
        setStatus("invalid");
      }
    }

    void verifyIncomingCode();
  }, [initialCode]);

  // Handle traditional verification form submit
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setStatus("loading");
    setCertData(null);

    const res = await api.verifyCertificate(code.trim());

    if (res.success && res.data?.isValid) {
      setCertData(res.data.certificate);
      setStatus("valid");
      trackOnboarding("verifiedCertificate");
    } else {
      setStatus("invalid");
    }
  };

  // Browser-native cryptographic verification file handler
  const processVerificationFile = async (selectedFile: File) => {
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf" && !selectedFile.name.endsWith(".pdf")) {
      setFileStatus("unsupported");
      setFileError("Unsupported file type. Please upload a Proofsy certificate PDF.");
      setFile(null);
      setCertData(null);
      return;
    }

    setFile(selectedFile);
    setFileStatus("loading");
    setFileError(null);
    setCertData(null);

    try {
      // 1. Get dynamic public key if not yet cached
      let keyPem = publicKeyPem;
      if (!keyPem) {
        const res = await api.getPublicKey();
        if (res.success && res.data?.publicKey) {
          keyPem = res.data.publicKey;
          setPublicKeyPem(keyPem);
        } else {
          throw new Error("Unable to retrieve verification public key from backend server.");
        }
      }

      // 2. Read PDF ArrayBuffer
      const arrayBuffer = await selectedFile.arrayBuffer();

      // 3. Load PDF client-side using pdf-lib
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const subject = pdfDoc.getSubject();
      const keywords = pdfDoc.getKeywords();

      if (!subject || !keywords) {
        setFileStatus("unsupported");
        setFileError("This PDF does not contain digital signatures. Only cryptographically secured Proofsy certificates are supported.");
        return;
      }

      // 4. Extract Signature (base64)
      let signatureBase64 = "";
      if (Array.isArray(keywords)) {
        signatureBase64 = keywords[0] || "";
      } else if (typeof keywords === "string") {
        signatureBase64 = keywords.split(/,\s*/)[0] || "";
      }
      signatureBase64 = signatureBase64.trim();

      if (!signatureBase64) {
        setFileStatus("unsupported");
        setFileError("Asymmetric signature keywords are empty. Secure metadata properties are missing.");
        return;
      }

      // 5. Parse Subject payload JSON
      let payload: any = null;
      try {
        payload = JSON.parse(subject);
      } catch (parseErr) {
        setFileStatus("invalid");
        setFileError("Validation Failed: The embedded Subject metadata structure is malformed or corrupted.");
        return;
      }

      // 6. Native Web Crypto Verification
      const keyBuffer = pemToArrayBuffer(keyPem);
      const cryptoKey = await window.crypto.subtle.importKey(
        "spki",
        keyBuffer,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
        },
        false,
        ["verify"]
      );

      const signatureBytes = Uint8Array.from(window.atob(signatureBase64), (c) => c.charCodeAt(0));
      const serializedData = serializePayload(payload);
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(serializedData);

      const isValid = await window.crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        signatureBytes,
        dataBytes
      );

      if (isValid) {
        setCertData({
          recipientName: payload.recipientName || "Unknown Recipient",
          eventName: payload.eventName || "Unknown Event",
          eventDate: null,
          issuedAt: payload.issuedAt || new Date().toISOString(),
          pdfUrl: null, // Client verified offline
          cryptographicSignature: signatureBase64,
          isCryptographicallyVerified: true,
        });
        setFileStatus("valid");
        trackOnboarding("verifiedCertificateOffline");
      } else {
        setFileStatus("invalid");
        setFileError("CRITICAL WARNING: The asymmetric digital signature does not match the payload. This file has been tampered with or modified offline!");
      }
    } catch (err: any) {
      console.error("Browser verification error:", err);
      setFileStatus("invalid");
      setFileError(err.message || "An unexpected error occurred during client-side verification.");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processVerificationFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processVerificationFile(e.target.files[0]);
    }
  };

  const resetFileState = () => {
    setFile(null);
    setFileStatus("idle");
    setFileError(null);
    setCertData(null);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col relative overflow-hidden">
      {/* Decorative background */}
      <motion.div variants={pulseGlow} animate="animate" className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-200/15 rounded-full blur-3xl pointer-events-none" />
      <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: '1.5s' }} className="absolute bottom-1/4 -right-20 w-72 h-72 bg-purple-200/10 rounded-full blur-3xl pointer-events-none" />

      {/* Minimal top bar */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="border-b border-[var(--color-border)] bg-[var(--color-surface)] relative z-10"
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
              <Image src="/logo.svg" alt="Proofsy" width={32} height={32} className="object-contain" />
            </div>
            <span className="text-base font-bold text-[var(--color-foreground)]">Proofsy</span>
          </Link>
          <span className="text-xs font-mono text-[var(--color-muted)] uppercase tracking-widest">Verification Portal</span>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
          className="w-full max-w-lg space-y-6"
        >
          {/* Hero */}
          <motion.div variants={fadeUp} className="text-center space-y-2">
            <motion.div variants={float} animate="animate" className="w-14 h-14 rounded-2xl bg-[var(--color-primary-faint)] flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-[var(--color-primary)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </motion.div>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Credential Verification</h1>
            <p className="text-xs text-[var(--color-muted)] max-w-xs mx-auto">
              Choose your verification method to instantly validate any Proofsy certificate.
            </p>
          </motion.div>

          {/* Premium Tab Selector */}
          <motion.div variants={fadeUp} className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl">
            <button
              onClick={() => { setActiveTab("code"); setCertData(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "code"
                  ? "bg-white text-[var(--color-primary)] shadow-sm"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              }`}
            >
              Verify by Code
            </button>
            <button
              onClick={() => { setActiveTab("file"); resetFileState(); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "file"
                  ? "bg-white text-[var(--color-primary)] shadow-sm"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              }`}
            >
              Verify by PDF File
            </button>
          </motion.div>

          {/* Tabs Render */}
          <AnimatePresence mode="wait">
            {activeTab === "code" ? (
              <motion.div
                key="code-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Code Form */}
                <form onSubmit={handleVerify} className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => { setCode(e.target.value); if (status !== "idle" && status !== "loading") setStatus("idle"); }}
                      placeholder="CERT-XXXXXXXX"
                      className="w-full border-2 border-[var(--color-border)] rounded-xl px-5 py-4 font-mono text-base uppercase tracking-wider focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 bg-[var(--color-surface)] placeholder:text-[var(--color-muted)]/40"
                      disabled={status === "loading"}
                    />
                    {code && status === "idle" && (
                      <button
                        type="button"
                        onClick={() => setCode("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-foreground)] cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                  <motion.button
                    type="submit"
                    disabled={status === "loading" || !code.trim()}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full bg-[var(--color-primary)] text-white font-semibold py-3.5 rounded-xl hover:bg-[var(--color-primary-dark)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm flex items-center justify-center gap-2 text-sm"
                  >
                    {status === "loading" ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Verifying Secure Database...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                        Verify Code
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Database Verification Results */}
                <AnimatePresence mode="wait">
                  {status === "valid" && certData && (
                    <motion.div
                      key="code-valid"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="bg-[var(--color-surface)] border-2 border-[var(--color-success)] rounded-xl overflow-hidden shadow-md"
                    >
                      <div className="bg-[var(--color-success-bg)] px-5 py-3.5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-success)] flex items-center justify-center shadow-sm">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-[var(--color-success)]">Certificate Verified</h2>
                          <p className="text-[10px] text-[var(--color-success)] opacity-75">This credential matches a valid database record.</p>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-0.5">Recipient</p>
                            <p className="text-xs font-semibold text-[var(--color-foreground)]">{certData.recipientName}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-0.5">Date Issued</p>
                            <p className="text-xs font-mono text-[var(--color-foreground)]">{formatDate(certData.issuedAt)}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-0.5">Event Name</p>
                          <p className="text-xs font-semibold text-[var(--color-foreground)]">{certData.eventName}</p>
                        </div>

                        {certData.isCryptographicallyVerified && (
                          <div className="border-t border-dashed border-[var(--color-border)] pt-4 mt-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                              <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                                Cryptographic Integrity
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 w-fit">
                                DIGITALLY SIGNED & VERIFIED ✓
                              </span>
                            </div>
                            <div className="bg-[var(--color-background)] rounded-lg p-2.5 font-mono text-[9px] text-[var(--color-muted)] break-all border border-[var(--color-border)] relative overflow-hidden">
                              <div className="absolute top-0 right-0 px-1.5 py-0.5 text-[8px] bg-[var(--color-border)] rounded-bl text-[var(--color-foreground)] font-sans select-none opacity-60">
                                RSA-SHA256
                              </div>
                              <div className="pr-16">
                                <span className="text-[var(--color-foreground)] font-semibold">Fingerprint: </span>
                                {certData.cryptographicSignature ? (
                                  <>
                                    <span className="text-emerald-500 font-bold">0X{certData.cryptographicSignature.substring(0, 16).toUpperCase()}</span>
                                    <span className="opacity-60">{certData.cryptographicSignature.substring(16, 75)}...</span>
                                  </>
                                ) : (
                                  "No signature"
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Dynamic Premium Export Action Bar */}
                        <div className="border-t border-dashed border-[var(--color-border)] pt-4 space-y-3">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                            Export & Download Formats
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {/* PDF Download Button */}
                            {certData.pdfUrl ? (
                              <motion.a
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                href={`${BACKEND_URL}${certData.pdfUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center p-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.02] hover:bg-rose-500/[0.06] hover:border-rose-500/40 text-center transition-all cursor-pointer group shadow-sm"
                              >
                                <div className="w-8 h-8 rounded-lg bg-rose-100/75 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform duration-250">
                                  <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                  </svg>
                                </div>
                                <span className="text-[10px] font-bold text-gray-800">PDF Document</span>
                                <span className="text-[8px] text-[var(--color-muted)] mt-0.5">Official Verification</span>
                              </motion.a>
                            ) : (
                              <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-[var(--color-border)] bg-gray-50/50 text-center opacity-50">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mb-1.5">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                  </svg>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400">PDF Document</span>
                                <span className="text-[8px] text-gray-400 mt-0.5">Unavailable</span>
                              </div>
                            )}

                            {/* PNG Download Button */}
                            {certData.pngUrl ? (
                              <motion.a
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                href={`${BACKEND_URL}${certData.pngUrl}`}
                                download={`${certData.recipientName.replace(/\s+/g, "_")}_certificate.png`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center p-3 rounded-xl border border-sky-500/20 bg-sky-500/[0.02] hover:bg-sky-500/[0.06] hover:border-sky-500/40 text-center transition-all cursor-pointer group shadow-sm"
                              >
                                <div className="w-8 h-8 rounded-lg bg-sky-100/75 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform duration-250">
                                  <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a6 6 0 0 1 8.486 0L21.75 15.75m-18-13.5h16.5a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5V3.75a1.5 1.5 0 0 1 1.5-1.5Zm10.5 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                                  </svg>
                                </div>
                                <span className="text-[10px] font-bold text-gray-800">High-Res PNG</span>
                                <span className="text-[8px] text-[var(--color-muted)] mt-0.5">Social Sharing</span>
                              </motion.a>
                            ) : (
                              <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-[var(--color-border)] bg-gray-50/50 text-center opacity-50">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mb-1.5">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a6 6 0 0 1 8.486 0L21.75 15.75m-18-13.5h16.5a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5V3.75a1.5 1.5 0 0 1 1.5-1.5Zm10.5 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                                  </svg>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400">High-Res PNG</span>
                                <span className="text-[8px] text-gray-400 mt-0.5">Social Sharing</span>
                              </div>
                            )}

                            {/* SVG Download Button */}
                            {certData.svgUrl ? (
                              <motion.a
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                href={`${BACKEND_URL}${certData.svgUrl}`}
                                download={`${certData.recipientName.replace(/\s+/g, "_")}_certificate.svg`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center p-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.02] hover:bg-amber-500/[0.06] hover:border-amber-500/40 text-center transition-all cursor-pointer group shadow-sm"
                              >
                                <div className="w-8 h-8 rounded-lg bg-amber-100/75 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform duration-250">
                                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                                  </svg>
                                </div>
                                <span className="text-[10px] font-bold text-gray-800">Vector SVG</span>
                                <span className="text-[8px] text-[var(--color-muted)] mt-0.5">Design / Print</span>
                              </motion.a>
                            ) : (
                              <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-[var(--color-border)] bg-gray-50/50 text-center opacity-50">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mb-1.5">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                                  </svg>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400">Vector SVG</span>
                                <span className="text-[8px] text-gray-400 mt-0.5">Design / Print</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {status === "invalid" && (
                    <motion.div
                      key="code-invalid"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[var(--color-surface)] border-2 border-[var(--color-error)] rounded-xl overflow-hidden shadow-md"
                    >
                      <div className="bg-[var(--color-error-bg)] px-5 py-3.5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-error)] flex items-center justify-center shadow-sm">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-[var(--color-error)]">Verification Failed</h2>
                          <p className="text-[10px] text-[var(--color-error)] opacity-75">No database record corresponds to this code.</p>
                        </div>
                      </div>
                      <div className="p-4 text-xs text-[var(--color-muted)]">
                        Verify that the code matches the string printed on your certificate exactly, then try again.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="file-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Drag and Drop Zone */}
                {fileStatus === "idle" && (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isDragActive
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-faint)] scale-[1.01]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-alt)]/20"
                    }`}
                  >
                    <input
                      type="file"
                      id="pdf-file-upload"
                      accept=".pdf"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <label htmlFor="pdf-file-upload" className="cursor-pointer flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shadow-sm border border-blue-100">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[var(--color-foreground)]">
                          Drag & drop certificate PDF here
                        </p>
                        <p className="text-[10px] text-[var(--color-muted)] mt-1">
                          or <span className="text-[var(--color-primary)] font-semibold hover:underline">browse files</span> from your device
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-[var(--color-muted)] opacity-60">
                        Cryptographic Drop-and-Prove Verifier
                      </span>
                    </label>
                  </div>
                )}

                {/* Offline verifier loading state */}
                {fileStatus === "loading" && (
                  <div className="border-2 border-[var(--color-border)] rounded-2xl p-10 text-center bg-[var(--color-surface)] flex flex-col items-center justify-center space-y-3">
                    <svg className="w-8 h-8 animate-spin text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    <div>
                      <p className="text-xs font-semibold text-[var(--color-foreground)]">Reading Certificate PDF...</p>
                      <p className="text-[10px] text-[var(--color-muted)] mt-0.5">Decrypting secure properties & checking signature offline...</p>
                    </div>
                  </div>
                )}

                {/* Offline Validation Success Card */}
                {fileStatus === "valid" && certData && (
                  <motion.div
                    key="file-valid"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[var(--color-surface)] border-2 border-emerald-500 rounded-xl overflow-hidden shadow-md"
                  >
                    <div className="bg-emerald-500/10 px-5 py-3.5 flex items-center gap-3 border-b border-emerald-500/20">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-emerald-600">Secure Offline Validation</h2>
                        <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider font-mono">
                          100% CRYPTOGRAPHICALLY SECURED ✓
                        </p>
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      {file && (
                        <div className="flex items-center gap-2 p-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg">
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                          <span className="text-[10px] font-medium text-[var(--color-foreground)] truncate max-w-xs">{file.name}</span>
                          <span className="text-[9px] text-[var(--color-muted)] font-mono ml-auto">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-0.5">Recipient</p>
                          <p className="text-xs font-semibold text-[var(--color-foreground)]">{certData.recipientName}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-0.5">Date Issued</p>
                          <p className="text-xs font-mono text-[var(--color-foreground)]">{formatDate(certData.issuedAt)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-0.5">Event Name</p>
                        <p className="text-xs font-semibold text-[var(--color-foreground)]">{certData.eventName}</p>
                      </div>

                      <div className="border-t border-dashed border-[var(--color-border)] pt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                            Dynamic RSA Asymmetric Signature
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 w-fit">
                            AUTHENTICATED BY PUBLIC KEY
                          </span>
                        </div>
                        <div className="bg-[var(--color-background)] rounded-lg p-2.5 font-mono text-[9px] text-[var(--color-muted)] break-all border border-[var(--color-border)] relative overflow-hidden">
                          <div className="absolute top-0 right-0 px-1.5 py-0.5 text-[8px] bg-[var(--color-border)] rounded-bl text-[var(--color-foreground)] font-sans select-none opacity-60">
                            RSA-SHA256
                          </div>
                          <div className="pr-16">
                            <span className="text-[var(--color-foreground)] font-semibold">Fingerprint: </span>
                            {certData.cryptographicSignature ? (
                              <>
                                <span className="text-emerald-500 font-bold">0X{certData.cryptographicSignature.substring(0, 16).toUpperCase()}</span>
                                <span className="opacity-60">{certData.cryptographicSignature.substring(16, 75)}...</span>
                              </>
                            ) : (
                              "No signature"
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={resetFileState}
                        className="w-full text-center py-2 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg text-xs font-semibold text-[var(--color-foreground)] hover:bg-gray-200 cursor-pointer"
                      >
                        Verify Another File
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Offline Validation Errors */}
                {(fileStatus === "invalid" || fileStatus === "unsupported") && (
                  <motion.div
                    key="file-error"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[var(--color-surface)] border-2 border-red-500 rounded-xl overflow-hidden shadow-md"
                  >
                    <div className="bg-red-500/10 px-5 py-3.5 flex items-center gap-3 border-b border-red-500/20">
                      <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-sm">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-red-600">Verification Failure</h2>
                        <p className="text-[10px] text-red-500 font-semibold uppercase tracking-wider font-mono">
                          {fileStatus === "invalid" ? "INTEGRITY CHECK FAILED ✗" : "INVALID DOCUMENT ✗"}
                        </p>
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      {file && (
                        <div className="flex items-center gap-2 p-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg">
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                          <span className="text-[10px] font-medium text-[var(--color-foreground)] truncate max-w-xs">{file.name}</span>
                        </div>
                      )}
                      
                      <p className="text-xs text-red-700 bg-red-50 p-3 rounded-lg leading-relaxed border border-red-100">
                        {fileError}
                      </p>

                      <button
                        onClick={resetFileState}
                        className="w-full text-center py-2 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg text-xs font-semibold text-[var(--color-foreground)] hover:bg-gray-200 cursor-pointer"
                      >
                        Try Again
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-4 text-center">
        <p className="text-[11px] text-[var(--color-muted)]">Powered by Proofsy. Certificate authenticity guaranteed.</p>
      </footer>
    </div>
  );
}
