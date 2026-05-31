"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import RevocationModal from "@/components/RevocationModal";
import { api, EventDetailData, BACKEND_URL } from "@/lib/api";
import { pageVariants, staggerContainer, fadeUp, headerSlide, tableRow, pulseGlow, cardTap } from "@/lib/animations";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);
  const [lifecycleResult, setLifecycleResult] = useState<string | null>(null);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [revokeTarget, setRevokeTarget] = useState<{
    mode: "single" | "bulk";
    certificateId?: string;
    recipientPreview?: string;
  } | null>(null);

  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;

  async function loadEvent() {
    if (!eventId) { setError("Missing event ID"); setLoading(false); return; }
    const res = await api.getEvent(eventId);
    if (res.success && res.data) {
      setEvent(res.data);
      setSelectedIds((current) => current.filter((id) => res.data!.certificates.some((certificate) => certificate.id === id)));
    } else {
      setError(res.error || "Event not found");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadEvent();
  }, [params.id]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const generated = event?.certificates.filter((c) => c.status === "generated").length || 0;
  const pending = event?.certificates.filter((c) => c.status === "pending").length || 0;
  const failed = event?.certificates.filter((c) => c.status === "failed").length || 0;
  const revoked = event?.certificates.filter((c) => c.status === "revoked").length || 0;
  const expired = event?.certificates.filter((c) => c.status === "expired").length || 0;
  const suspended = event?.certificates.filter((c) => c.status === "suspended").length || 0;

  const statusClass = (status: string) => {
    if (status === "generated") return "bg-[var(--color-success-bg)] text-[var(--color-success)]";
    if (status === "failed" || status === "revoked") return "bg-[var(--color-error-bg)] text-[var(--color-error)]";
    if (status === "expired" || status === "suspended") return "bg-amber-50 text-amber-700";
    return "bg-[var(--color-warning-bg)] text-[var(--color-warning)]";
  };

  const statusDotClass = (status: string) => {
    if (status === "generated") return "bg-[var(--color-success)]";
    if (status === "failed" || status === "revoked") return "bg-[var(--color-error)]";
    if (status === "expired" || status === "suspended") return "bg-amber-600";
    return "bg-[var(--color-warning)] animate-pulse";
  };

  const formatDateInput = (iso?: string | null) => {
    if (!iso) return "";
    return new Date(iso).toISOString().slice(0, 10);
  };

  const handleSendEmails = async () => {
    if (!event) return;
    setSendingEmails(true);
    setEmailResult(null);
    try {
      const res = await api.sendEmails(eventId as string);
      if (res.success) {
        setEmailResult(res.message || `Sent: ${res.data?.sent}, Failed: ${res.data?.failed}`);
      } else {
        setEmailResult(`Error: ${res.error}`);
      }
    } catch {
      setEmailResult("Failed to send emails");
    }
    setSendingEmails(false);
  };

  const runLifecycleAction = async (action: () => Promise<{ success: boolean; error?: string; message?: string }>, successMessage: string) => {
    setLifecycleLoading(true);
    setLifecycleResult(null);
    const res = await action();
    if (res.success) {
      setLifecycleResult(successMessage);
      await loadEvent();
    } else {
      setLifecycleResult(`Error: ${res.error || "Lifecycle update failed"}`);
    }
    setLifecycleLoading(false);
  };

  const confirmRevocation = async (reason: string) => {
    if (!revokeTarget) return;
    if (revokeTarget.mode === "bulk") {
      await runLifecycleAction(
        () => api.bulkRevokeCertificates(selectedIds, reason),
        `Revoked ${selectedIds.length} selected certificate(s).`
      );
      setSelectedIds([]);
    } else if (revokeTarget.certificateId) {
      await runLifecycleAction(
        () => api.revokeCertificate(revokeTarget.certificateId!, reason),
        "Certificate revoked."
      );
    }
    setRevokeTarget(null);
  };

  const handleExpiryChange = async (certificateId: string, expiresAt: string) => {
    await runLifecycleAction(
      () => api.updateCertificateExpiry(certificateId, expiresAt || null),
      expiresAt ? "Certificate expiry updated." : "Certificate expiry cleared."
    );
  };

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
                  <motion.div whileTap={cardTap}>
                    <Link
                      href={`/events/${eventId}/add-recipients`}
                      className="border border-[var(--color-border)] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--color-surface-alt)] flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>
                      Add Recipients
                    </Link>
                  </motion.div>
                  <motion.button
                    onClick={handleSendEmails}
                    disabled={sendingEmails || generated === 0}
                    whileTap={cardTap}
                    className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--color-primary-dark)] flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                    {sendingEmails ? "Sending..." : "Send Emails"}
                  </motion.button>
                </div>
              </div>
            </motion.header>

            <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 space-y-6 relative z-[1]">
              {/* Stats */}
              <motion.div variants={staggerContainer} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  { label: "Total Certificates", value: event.certificates.length, color: "text-[var(--color-foreground)]" },
                  { label: "Generated", value: generated, color: "text-[var(--color-success)]" },
                  { label: "Pending", value: pending, color: "text-[var(--color-warning)]" },
                  { label: "Failed", value: failed, color: "text-[var(--color-error)]" },
                  { label: "Revoked", value: revoked, color: "text-[var(--color-error)]" },
                  { label: "Expired/Suspended", value: expired + suspended, color: "text-amber-700" },
                ].map((stat) => (
                  <motion.div key={stat.label} variants={fadeUp} className="bg-white rounded-2xl border border-[var(--color-border)] p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">{stat.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                  </motion.div>
                ))}
              </motion.div>

              {emailResult && (
                <div className={`rounded-xl px-5 py-3 text-sm font-medium ${emailResult.startsWith("Error") || emailResult.startsWith("Failed") ? "bg-[var(--color-error-bg)] text-[var(--color-error)]" : "bg-[var(--color-success-bg)] text-[var(--color-success)]"}`}>
                  {emailResult}
                </div>
              )}

              {lifecycleResult && (
                <div className={`rounded-xl px-5 py-3 text-sm font-medium ${lifecycleResult.startsWith("Error") ? "bg-[var(--color-error-bg)] text-[var(--color-error)]" : "bg-[var(--color-success-bg)] text-[var(--color-success)]"}`}>
                  {lifecycleResult}
                </div>
              )}

              {/* Certificates table */}
              <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border)] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-foreground)]">Issued Certificates</h3>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">Manage expiry, revocation, suspension, and renewal.</p>
                  </div>
                  <button
                    onClick={() => setRevokeTarget({ mode: "bulk" })}
                    disabled={selectedIds.length === 0 || lifecycleLoading}
                    className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Revoke Selected ({selectedIds.length})
                  </button>
                </div>
                {event.certificates.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <p className="text-base font-semibold text-[var(--color-foreground)]">No certificates yet</p>
                    <p className="text-sm text-[var(--color-muted)] mt-1">Upload a CSV to issue credentials for this event.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] text-left">
                    <thead>
                      <tr className="bg-[var(--color-surface-alt)]">
                        <th className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.length === event.certificates.length}
                            onChange={(e) => setSelectedIds(e.target.checked ? event.certificates.map((c) => c.id) : [])}
                            className="w-4 h-4 rounded border-[var(--color-border)]"
                          />
                        </th>
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Recipient</th>
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Code</th>
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Issued</th>
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Expires</th>
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Status</th>
                        <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)] text-right">Actions</th>
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
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(c.id)}
                              onChange={(e) => {
                                setSelectedIds((current) =>
                                  e.target.checked ? [...current, c.id] : current.filter((id) => id !== c.id)
                                );
                              }}
                              className="w-4 h-4 rounded border-[var(--color-border)]"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-[var(--color-foreground)]">{c.recipientName}</p>
                            <p className="text-xs text-[var(--color-muted)]">{c.recipientEmail}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-semibold text-[var(--color-primary)]">{c.verificationCode}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--color-muted)]">{formatDate(c.issuedAt)}</td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="date"
                                key={c.expiresAt || "empty"}
                                defaultValue={formatDateInput(c.expiresAt)}
                              onBlur={(e) => handleExpiryChange(c.id, e.target.value)}
                              className="border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-xs"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusClass(c.status)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass(c.status)}`} />
                              {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                            {c.pdfUrl ? (
                              <a
                                href={`${BACKEND_URL}${c.pdfUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                              >
                                PDF
                              </a>
                            ) : (
                              <span className="text-xs text-[var(--color-muted)]">No PDF</span>
                            )}
                              <button
                                onClick={() => setRevokeTarget({ mode: "single", certificateId: c.id, recipientPreview: `${c.recipientName} (${c.recipientEmail})` })}
                                disabled={lifecycleLoading || c.status === "revoked"}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 disabled:opacity-40"
                              >
                                Revoke
                              </button>
                              {c.status === "suspended" ? (
                                <button
                                  onClick={() => runLifecycleAction(() => api.reinstateCertificate(c.id), "Certificate reinstated.")}
                                  disabled={lifecycleLoading}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 disabled:opacity-40"
                                >
                                  Reinstate
                                </button>
                              ) : (
                                <button
                                  onClick={() => runLifecycleAction(() => api.suspendCertificate(c.id), "Certificate suspended.")}
                                  disabled={lifecycleLoading || c.status === "revoked" || c.status === "expired"}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 disabled:opacity-40"
                                >
                                  Suspend
                                </button>
                              )}
                              <button
                                onClick={() => runLifecycleAction(() => api.renewCertificate(c.id, c.expiresAt || null), "Certificate renewal queued.")}
                                disabled={lifecycleLoading}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 disabled:opacity-40"
                              >
                                Renew
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </main>
      <RevocationModal
        open={Boolean(revokeTarget)}
        title={revokeTarget?.mode === "bulk" ? "Bulk Revoke Certificates" : "Revoke Certificate"}
        recipientPreview={revokeTarget?.recipientPreview}
        count={revokeTarget?.mode === "bulk" ? selectedIds.length : undefined}
        loading={lifecycleLoading}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={confirmRevocation}
      />
    </div>
  );
}
