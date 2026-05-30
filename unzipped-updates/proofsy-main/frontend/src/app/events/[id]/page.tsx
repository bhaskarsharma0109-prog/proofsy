"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { api, EventDetailData, BACKEND_URL } from "@/lib/api";
import { pageVariants, staggerContainer, fadeUp, headerSlide, tableRow, pulseGlow } from "@/lib/animations";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const id = Array.isArray(params.id) ? params.id[0] : params.id;
      if (!id) { setError("Missing event ID"); setLoading(false); return; }
      const res = await api.getEvent(id);
      if (res.success && res.data) {
        setEvent(res.data);
      } else {
        setError(res.error || "Event not found");
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const generated = event?.certificates.filter((c) => c.status === "generated").length || 0;
  const pending = event?.certificates.filter((c) => c.status === "pending").length || 0;
  const failed = event?.certificates.filter((c) => c.status === "failed").length || 0;

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-16 right-20 w-56 h-56 bg-blue-200/15 rounded-full blur-3xl pointer-events-none" />

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)] animate-spin" />
          </div>
        ) : error || !event ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <h2 className="text-xl font-bold text-[var(--color-foreground)]">Event not found</h2>
              <p className="text-sm text-[var(--color-muted)] mt-2">{error}</p>
              <Link href="/" className="inline-flex mt-4 items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium">
                Back to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <>
            <motion.header variants={headerSlide} initial="hidden" animate="visible" className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <Link href="/" className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                    </Link>
                    <h2 className="text-xl font-bold text-[var(--color-foreground)]">{event.name}</h2>
                  </div>
                  <p className="text-sm text-[var(--color-muted)]">
                    {formatDate(event.date)} · Organized by {event.organizerName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/events/new?template=${encodeURIComponent(event.templateId || "modern")}`}
                    className="border border-[var(--color-border)] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--color-surface-alt)] flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Add Recipients
                  </Link>
                </div>
              </div>
            </motion.header>

            <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 space-y-6 relative z-[1]">
              {/* Stats */}
              <motion.div variants={staggerContainer} className="grid grid-cols-4 gap-4">
                {[
                  { label: "Total Certificates", value: event.certificates.length, color: "text-[var(--color-foreground)]" },
                  { label: "Generated", value: generated, color: "text-[var(--color-success)]" },
                  { label: "Pending", value: pending, color: "text-[var(--color-warning)]" },
                  { label: "Failed", value: failed, color: "text-[var(--color-error)]" },
                ].map((stat) => (
                  <motion.div key={stat.label} variants={fadeUp} className="bg-white rounded-2xl border border-[var(--color-border)] p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">{stat.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Certificates table */}
              <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border)]">
                  <h3 className="text-sm font-bold text-[var(--color-foreground)]">Issued Certificates</h3>
                </div>
                {event.certificates.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <p className="text-base font-semibold text-[var(--color-foreground)]">No certificates yet</p>
                    <p className="text-sm text-[var(--color-muted)] mt-1">Upload a CSV to issue credentials for this event.</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[var(--color-surface-alt)]">
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Recipient</th>
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Code</th>
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Issued</th>
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Status</th>
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)] text-right">PDF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {event.certificates.map((c, i) => (
                        <motion.tr
                          key={c.id}
                          variants={tableRow}
                          initial="hidden"
                          animate="visible"
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-[var(--color-surface-alt)] cursor-pointer"
                          onClick={() => router.push(`/certificates/${c.id}`)}
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-[var(--color-foreground)]">{c.recipientName}</p>
                            <p className="text-xs text-[var(--color-muted)]">{c.recipientEmail}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-semibold text-[var(--color-primary)]">{c.verificationCode}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--color-muted)]">{formatDate(c.issuedAt)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                              c.status === "generated" ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                                : c.status === "failed" ? "bg-[var(--color-error-bg)] text-[var(--color-error)]"
                                : "bg-[var(--color-warning-bg)] text-[var(--color-warning)]"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                c.status === "generated" ? "bg-[var(--color-success)]"
                                  : c.status === "failed" ? "bg-[var(--color-error)]"
                                  : "bg-[var(--color-warning)] animate-pulse"
                              }`} />
                              {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {c.pdfUrl ? (
                              <a
                                href={`${BACKEND_URL}${c.pdfUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                              >
                                Download ↓
                              </a>
                            ) : (
                              <span className="text-xs text-[var(--color-muted)]">—</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}
