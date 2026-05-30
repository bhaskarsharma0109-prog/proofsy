"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { api, EventDetailData } from "@/lib/api";
import { pageVariants, fadeUp, cardHover, cardTap } from "@/lib/animations";

interface Recipient {
  id: string;
  name: string;
  email: string;
}

export default function AddRecipientsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [event, setEvent] = useState<EventDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"manual" | "csv">("csv");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      if (!eventId) return;
      const res = await api.getEvent(eventId);
      if (res.success && res.data) setEvent(res.data);
      setLoading(false);
    }
    load();
  }, [eventId]);

  const addRecipient = () => {
    if (!newName.trim() || !newEmail.trim()) return;
    setRecipients([...recipients, { id: Date.now().toString(), name: newName.trim(), email: newEmail.trim().toLowerCase() }]);
    setNewName("");
    setNewEmail("");
  };

  const removeRecipient = (id: string) => {
    setRecipients(recipients.filter((r) => r.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]?.name.endsWith(".csv")) setFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setResult(null);

    let csvFile = file;

    // If manual recipients, build a CSV
    if (tab === "manual" && recipients.length > 0) {
      const csvContent = "name,email\n" + recipients.map((r) => `${r.name},${r.email}`).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      csvFile = new File([blob], "recipients.csv", { type: "text/csv" });
    }

    if (!csvFile) {
      setResult({ type: "error", message: "No recipients to add. Upload a CSV or add manually." });
      setSubmitting(false);
      return;
    }

    const res = await api.generateCertificates(eventId!, csvFile);
    if (res.success) {
      setResult({ type: "success", message: res.data?.message || "Recipients added and certificates queued!" });
      setFile(null);
      setRecipients([]);
      // Reload event data
      const updated = await api.getEvent(eventId!);
      if (updated.success && updated.data) setEvent(updated.data);
    } else {
      setResult({ type: "error", message: res.error || "Failed to add recipients" });
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[var(--color-background)]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)] animate-spin" />
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen bg-[var(--color-background)]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">Event not found</h2>
            <Link href="/" className="inline-flex mt-4 items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium">
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Link href={`/events/${eventId}`} className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                </Link>
                <h2 className="text-xl font-bold text-[var(--color-foreground)]">Add Recipients</h2>
              </div>
              <p className="text-sm text-[var(--color-muted)]">
                Add more recipients to <span className="font-semibold text-[var(--color-foreground)]">{event.name}</span> · {event.certificates.length} existing certificates
              </p>
            </div>
          </div>
        </header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 max-w-4xl space-y-6">
          {/* Result banner */}
          {result && (
            <div className={`rounded-xl px-5 py-3 text-sm font-medium ${result.type === "success" ? "bg-[var(--color-success-bg)] text-[var(--color-success)]" : "bg-[var(--color-error-bg)] text-[var(--color-error)]"}`}>
              {result.message}
              {result.type === "success" && (
                <button onClick={() => router.push(`/events/${eventId}`)} className="ml-3 underline font-semibold">
                  View Event →
                </button>
              )}
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex gap-1 bg-[var(--color-surface-alt)] p-1 rounded-xl w-fit">
            <motion.button onClick={() => setTab("csv")} whileHover={cardHover} whileTap={cardTap} className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${tab === "csv" ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-foreground)]" : "text-[var(--color-muted)]"}`}>
              Upload CSV
            </motion.button>
            <motion.button onClick={() => setTab("manual")} whileHover={cardHover} whileTap={cardTap} className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${tab === "manual" ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-foreground)]" : "text-[var(--color-muted)]"}`}>
              Add Manually
            </motion.button>
          </div>

          {/* CSV Upload */}
          {tab === "csv" && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
                  ${isDragging ? "border-[var(--color-primary)] bg-[var(--color-primary-faint)]" : file ? "border-[var(--color-success)] bg-[var(--color-success-bg)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-alt)]"}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-success)] flex items-center justify-center"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></div>
                    <p className="text-sm font-semibold text-[var(--color-success)]">{file.name}</p>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-xs text-[var(--color-error)] hover:underline cursor-pointer">Remove</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-[var(--color-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                    <p className="text-sm">Drop CSV here or <span className="text-[var(--color-primary)] font-medium">browse</span></p>
                    <p className="text-xs text-[var(--color-muted)]">Required columns: name, email</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Manual Entry */}
          {tab === "manual" && (
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 space-y-5">
              <div className="flex gap-3">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} type="text" placeholder="Full Name" className="flex-1 border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-muted)]/50" />
                <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="Email Address" onKeyDown={(e) => e.key === "Enter" && addRecipient()} className="flex-1 border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-muted)]/50" />
                <button onClick={addRecipient} className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] cursor-pointer shrink-0">
                  Add
                </button>
              </div>

              {recipients.length > 0 ? (
                <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[var(--color-surface-alt)]">
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Name</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Email</th>
                        <th className="px-4 py-2.5 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {recipients.map((r) => (
                        <tr key={r.id} className="hover:bg-[var(--color-surface-alt)]">
                          <td className="px-4 py-3 text-sm font-medium">{r.name}</td>
                          <td className="px-4 py-3 text-sm text-[var(--color-muted)]">{r.email}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => removeRecipient(r.id)} className="text-[var(--color-error)] hover:text-red-700 cursor-pointer">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--color-muted)]">
                  <p className="text-sm">No recipients added yet.</p>
                  <p className="text-xs mt-1">Enter a name and email above.</p>
                </div>
              )}
              <p className="text-xs text-[var(--color-muted)]">{recipients.length} recipient{recipients.length !== 1 ? "s" : ""} added</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link href={`/events/${eventId}`} className="px-5 py-2.5 border border-[var(--color-border)] rounded-xl text-sm font-medium hover:bg-[var(--color-surface-alt)]">
              ← Back to Event
            </Link>
            <motion.button
              onClick={handleSubmit}
              disabled={submitting || (tab === "csv" ? !file : recipients.length === 0)}
              whileTap={cardTap}
              className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[var(--color-primary-dark)] cursor-pointer shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>
                  Add Recipients & Generate Certificates
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
