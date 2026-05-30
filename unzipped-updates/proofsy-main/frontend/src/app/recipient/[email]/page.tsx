"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { api, RecipientPortalData, BACKEND_URL } from "@/lib/api";
import { fadeUp, pulseGlow } from "@/lib/animations";

export default function RecipientPortalPage() {
  const params = useParams();
  const [data, setData] = useState<RecipientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const email = decodeURIComponent(
        Array.isArray(params.email) ? params.email[0] : params.email || ""
      );
      if (!email) { setError("No email provided"); setLoading(false); return; }
      const res = await api.getUserCertificates(email);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Recipient not found");
      }
      setLoading(false);
    }
    load();
  }, [params.email]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] relative overflow-hidden">
      <motion.div variants={pulseGlow} animate="animate" className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-200/15 rounded-full blur-3xl pointer-events-none" />
      <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: "1.5s" }} className="absolute bottom-1/4 -right-20 w-72 h-72 bg-purple-200/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top bar */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="border-b border-[var(--color-border)] bg-[var(--color-surface)] relative z-10"
      >
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
              <Image src="/logo.svg" alt="Proofsy" width={32} height={32} className="object-contain" />
            </div>
            <span className="text-base font-bold text-[var(--color-foreground)]">Proofsy</span>
          </Link>
          <span className="text-xs font-mono text-[var(--color-muted)] uppercase tracking-widest">Recipient Portal</span>
        </div>
      </motion.header>

      <main className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 mx-auto rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)] animate-spin" />
            <p className="mt-4 text-sm text-[var(--color-muted)]">Loading your credentials...</p>
          </div>
        ) : error || !data ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-error-bg)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[var(--color-error)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">Recipient Not Found</h2>
            <p className="text-sm text-[var(--color-muted)] mt-2">{error || "We couldn't find any records for this email."}</p>
            <Link href="/verify" className="inline-flex mt-5 items-center gap-2 bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
              Verify a Certificate
            </Link>
          </div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}>
            {/* Profile header */}
            <motion.div variants={fadeUp} className="text-center mb-10">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-white">{data.user.name.charAt(0).toUpperCase()}</span>
              </div>
              <h1 className="text-2xl font-bold text-[var(--color-foreground)]">{data.user.name}</h1>
              <p className="text-sm text-[var(--color-muted)] mt-1">{data.user.email}</p>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div>
                  <p className="text-2xl font-bold text-[var(--color-foreground)]">{data.certificates.length}</p>
                  <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">Credentials</p>
                </div>
                <div className="w-px h-8 bg-[var(--color-border)]" />
                <div>
                  <p className="text-2xl font-bold text-[var(--color-foreground)]">{data.totalEventsAttended}</p>
                  <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">Events</p>
                </div>
              </div>
            </motion.div>

            {/* Certificate cards */}
            {data.certificates.length === 0 ? (
              <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center">
                <p className="text-base font-semibold text-[var(--color-foreground)]">No certificates yet</p>
                <p className="text-sm text-[var(--color-muted)] mt-2">Certificates will appear here once issued.</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {data.certificates.map((cert) => (
                  <motion.div key={cert.id} variants={fadeUp} className="bg-white rounded-2xl border border-[var(--color-border)] p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-[var(--color-foreground)]">{cert.eventName}</h3>
                        <p className="text-xs text-[var(--color-muted)] mt-1">
                          {formatDate(cert.eventDate)} · Code: <span className="font-mono font-semibold text-[var(--color-primary)]">{cert.verificationCode}</span>
                        </p>
                        <p className="text-xs text-[var(--color-muted)] mt-1">Issued {formatDate(cert.issuedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {cert.pdfUrl && (
                          <a
                            href={`${BACKEND_URL}${cert.pdfUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 border border-[var(--color-border)] px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface-alt)]"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                            PDF
                          </a>
                        )}
                        <Link
                          href={`/verify?code=${encodeURIComponent(cert.verificationCode)}`}
                          className="flex items-center gap-1.5 bg-[var(--color-primary)] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--color-primary-dark)]"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
                          Verify
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>

      <footer className="border-t border-[var(--color-border)] py-4 text-center relative z-10">
        <p className="text-[11px] text-[var(--color-muted)]">Powered by Proofsy. Certificate authenticity guaranteed.</p>
      </footer>
    </div>
  );
}
