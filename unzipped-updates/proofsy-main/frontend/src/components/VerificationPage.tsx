"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { api, BACKEND_URL } from "@/lib/api";
import { fadeUp, float, pulseGlow } from "@/lib/animations";

export default function VerificationPage({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [certData, setCertData] = useState<{
    recipientName: string;
    eventName: string;
    eventDate: string | null;
    issuedAt: string;
    pdfUrl: string | null;
  } | null>(null);

  useEffect(() => {
    async function verifyIncomingCode() {
      if (!initialCode) return;

      setStatus("loading");
      setCertData(null);

      const res = await api.verifyCertificate(initialCode.trim());

      if (res.success && res.data?.isValid) {
        setCertData(res.data.certificate);
        setStatus("valid");
      } else {
        setStatus("invalid");
      }
    }

    void verifyIncomingCode();
  }, [initialCode]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setStatus("loading");
    setCertData(null);

    const res = await api.verifyCertificate(code.trim());

    if (res.success && res.data?.isValid) {
      setCertData(res.data.certificate);
      setStatus("valid");
    } else {
      setStatus("invalid");
    }
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
      <main className="flex-1 flex items-center justify-center px-4 py-16 relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } }}
          className="w-full max-w-md space-y-8"
        >
          {/* Hero */}
          <motion.div variants={fadeUp} className="text-center space-y-3">
            <motion.div variants={float} animate="animate" className="w-16 h-16 rounded-2xl bg-[var(--color-primary-faint)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[var(--color-primary)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </motion.div>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Verify a Certificate</h1>
            <p className="text-sm text-[var(--color-muted)] max-w-xs mx-auto">
              Enter the verification code found on the certificate to confirm its authenticity.
            </p>
          </motion.div>

          {/* Form */}
          <motion.form variants={fadeUp} onSubmit={handleVerify} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value); if (status !== "idle" && status !== "loading") setStatus("idle"); }}
                placeholder="CERT-XXXXXXXX"
                className="w-full border-2 border-[var(--color-border)] rounded-xl px-5 py-4 font-mono text-lg uppercase tracking-wider focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 bg-[var(--color-surface)] placeholder:text-[var(--color-muted)]/40"
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-[var(--color-primary)] text-white font-semibold py-3.5 rounded-xl hover:bg-[var(--color-primary-dark)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Verifying...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                  Verify Certificate
                </>
              )}
            </motion.button>
          </motion.form>

          {/* Results with AnimatePresence */}
          <AnimatePresence mode="wait">
            {/* Valid result */}
            {status === "valid" && certData && (
              <motion.div
                key="valid"
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.97 }}
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="bg-[var(--color-surface)] border-2 border-[var(--color-success)] rounded-xl overflow-hidden shadow-lg"
              >
                <div className="bg-[var(--color-success-bg)] px-6 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-success)] flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[var(--color-success)]">Certificate Verified</h2>
                    <p className="text-[11px] text-[var(--color-success)] opacity-75">This certificate is authentic and valid.</p>
                  </div>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">Recipient</p>
                      <p className="text-sm font-medium text-[var(--color-foreground)]">{certData.recipientName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">Date Issued</p>
                      <p className="text-sm font-mono text-[var(--color-foreground)]">{formatDate(certData.issuedAt)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">Event</p>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">{certData.eventName}</p>
                  </div>
                  {certData.pdfUrl && (
                    <a
                      href={`${BACKEND_URL}${certData.pdfUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center py-2.5 border border-[var(--color-border)] rounded-lg text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-faint)] cursor-pointer"
                    >
                      Download Certificate PDF →
                    </a>
                  )}
                </div>
              </motion.div>
          )}

          {/* Invalid result */}
          {status === "invalid" && (
            <motion.div
              key="invalid"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-[var(--color-surface)] border-2 border-[var(--color-error)] rounded-xl overflow-hidden shadow-lg"
            >
              <div className="bg-[var(--color-error-bg)] px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-error)] flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--color-error)]">Verification Failed</h2>
                  <p className="text-[11px] text-[var(--color-error)] opacity-75">No certificate matches this code.</p>
                </div>
              </div>
              <div className="px-6 py-4">
                <p className="text-sm text-[var(--color-muted)]">
                  Double-check the code on your certificate. If the issue persists, contact the issuing organization.
                </p>
              </div>
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
