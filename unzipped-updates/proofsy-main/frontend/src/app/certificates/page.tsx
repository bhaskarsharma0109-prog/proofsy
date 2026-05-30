"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, CertificateData } from "@/lib/api";
import { pageVariants, fadeUp, headerSlide, tableRow, pulseGlow } from "@/lib/animations";

export default function CertificatesListPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      const res = await api.listCertificates();
      if (res.success && res.data) {
        setCertificates(res.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  const formatDate = (iso: string | null) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const filteredCertificates = useMemo(
    () =>
      certificates.filter((certificate) =>
        [
          certificate.verificationCode,
          certificate.recipientName,
          certificate.recipientEmail,
          certificate.eventName,
          certificate.templateId,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [certificates, query]
  );

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-20 right-16 w-60 h-60 bg-emerald-200/15 rounded-full blur-3xl pointer-events-none" />

        <motion.header variants={headerSlide} initial="hidden" animate="visible" className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">All Credentials</h2>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">View and manage all issued certificates.</p>
          </div>
          <Link href="/events/new" className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl hover:bg-[var(--color-primary-dark)] font-semibold text-sm shadow-sm flex items-center gap-2 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Issue New
          </Link>
        </motion.header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 relative z-[1]">
          {loading ? (
            <div className="bg-white rounded-2xl border border-[var(--color-border)] px-6 py-16 text-center">
              <svg className="w-6 h-6 animate-spin mx-auto text-[var(--color-muted)]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              <p className="text-sm text-[var(--color-muted)] mt-3">Loading certificates...</p>
            </div>
          ) : certificates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[var(--color-border)] px-6 py-16 text-center">
              <svg className="w-14 h-14 mx-auto text-[var(--color-muted)] opacity-25 mb-4" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
              <p className="text-base font-semibold text-[var(--color-foreground)]">No credentials issued yet</p>
              <p className="text-sm text-[var(--color-muted)] mt-1 max-w-sm mx-auto">Create an event and add recipients to start issuing certificates.</p>
              <Link href="/events/new" className="inline-flex items-center gap-2 mt-5 bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Create Event
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
                <p className="text-sm text-[var(--color-muted)]">{filteredCertificates.length} credential{filteredCertificates.length !== 1 ? "s" : ""}</p>
                <div className="relative">
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                  <input value={query} onChange={(event) => setQuery(event.target.value)} type="text" placeholder="Search credentials..." className="border border-[var(--color-border)] rounded-lg pl-9 pr-4 py-1.5 text-xs w-56 focus:outline-none focus:border-[var(--color-primary)]" />
                </div>
              </div>
              {filteredCertificates.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-base font-semibold text-[var(--color-foreground)]">No matching credentials</p>
                  <p className="text-sm text-[var(--color-muted)] mt-1">Try a different recipient, code, event, or template search.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[var(--color-surface-alt)]">
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Code</th>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Recipient</th>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Event</th>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Template</th>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Issued</th>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)] text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {filteredCertificates.map((c, i) => (
                      <motion.tr key={c.id} variants={tableRow} initial="hidden" animate="visible" transition={{ delay: i * 0.03 }} onClick={() => router.push(`/certificates/${c.id}`)} className="hover:bg-[var(--color-surface-alt)] cursor-pointer group">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-semibold text-[var(--color-primary)]">{c.verificationCode}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-[var(--color-foreground)]">{c.recipientName}</p>
                            <p className="text-xs text-[var(--color-muted)]">{c.recipientEmail}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--color-muted)]">{c.eventName}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-muted)] capitalize">{c.templateId}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--color-muted)]">{formatDate(c.issuedAt)}</td>
                        <td className="px-6 py-4 text-right">
                          {c.status === "generated" ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />Generated
                            </span>
                          ) : c.status === "failed" ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--color-error-bg)] text-[var(--color-error)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-error)]" />Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--color-warning-bg)] text-[var(--color-warning)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)] animate-pulse" />Pending
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
