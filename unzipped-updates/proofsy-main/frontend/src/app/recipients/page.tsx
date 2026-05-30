"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { api, CertificateData, UserLookupData } from "@/lib/api";
import { pageVariants, staggerContainer, fadeUp, headerSlide, tableRow, pulseGlow } from "@/lib/animations";

interface RecipientRow {
  id: string;
  name: string;
  email: string;
  events: number;
  lastIssued: string;
}

export default function RecipientsPage() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [manualRecipients, setManualRecipients] = useState<RecipientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupResult, setLookupResult] = useState<UserLookupData | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const [certsRes, usersRes] = await Promise.all([
        api.listCertificates(),
        api.listUsers(),
      ]);
      if (certsRes.success && certsRes.data) setCertificates(certsRes.data);
      if (usersRes.success && usersRes.data) {
        // Merge users from the users endpoint as base recipients
        const userRows: RecipientRow[] = usersRes.data.map((u) => ({
          id: u.id || u.email,
          name: u.name,
          email: u.email,
          events: u.totalEventsAttended || 0,
          lastIssued: "—",
        }));
        setManualRecipients(userRows);
      }
      setLoading(false);
    }
    load();
  }, []);

  const recipients = useMemo(() => {
    const map = new Map<string, RecipientRow>();

    for (const certificate of certificates) {
      const existing = map.get(certificate.recipientEmail.toLowerCase());
      const issuedLabel = new Date(certificate.issuedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      if (!existing) {
        map.set(certificate.recipientEmail.toLowerCase(), {
          id: certificate.recipientEmail.toLowerCase(),
          name: certificate.recipientName,
          email: certificate.recipientEmail,
          events: 1,
          lastIssued: issuedLabel,
        });
        continue;
      }

      existing.events += 1;
      if (new Date(certificate.issuedAt) > new Date(existing.lastIssued)) {
        existing.lastIssued = issuedLabel;
      }
    }

    return [...manualRecipients, ...Array.from(map.values())];
  }, [certificates, manualRecipients]);

  const filtered = recipients.filter(
    (recipient) =>
      recipient.name.toLowerCase().includes(search.toLowerCase()) ||
      recipient.email.toLowerCase().includes(search.toLowerCase())
  );

  const addRecipient = () => {
    if (!newName.trim() || !newEmail.trim()) return;

    setManualRecipients((current) => [
      {
        id: `manual-${Date.now()}`,
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        events: 0,
        lastIssued: "Not issued yet",
      },
      ...current,
    ]);
    setNewName("");
    setNewEmail("");
    setShowAdd(false);
  };

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lookupEmail.trim()) return;

    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    const res = await api.getUserByEmail(lookupEmail.trim().toLowerCase());

    if (!res.success || !res.data) {
      setLookupError(res.error || "User lookup failed.");
      setLookupLoading(false);
      return;
    }

    setLookupResult(res.data);
    setLookupLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-20 right-16 w-56 h-56 bg-purple-200/15 rounded-full blur-3xl pointer-events-none" />

        <motion.header variants={headerSlide} initial="hidden" animate="visible" className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">Recipients</h2>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">Manage everyone who has received or will receive certificates.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAdd(!showAdd)}
            className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl hover:bg-[var(--color-primary-dark)] font-semibold text-sm shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>
            Add Recipient
          </motion.button>
        </motion.header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 space-y-6 relative z-[1]">
          <section className="bg-white rounded-2xl border border-[var(--color-border)] p-5">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <h3 className="text-base font-bold text-[var(--color-foreground)]">User Lookup</h3>
                <p className="text-sm text-[var(--color-muted)] mt-1">Check whether a recipient exists and see their event and certificate totals.</p>
                <form onSubmit={handleLookup} className="mt-4 flex gap-3">
                  <input
                    value={lookupEmail}
                    onChange={(event) => setLookupEmail(event.target.value)}
                    type="email"
                    placeholder="recipient@example.com"
                    className="flex-1 border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                  <button
                    type="submit"
                    disabled={lookupLoading || !lookupEmail.trim()}
                    className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
                  >
                    {lookupLoading ? "Looking up..." : "Lookup User"}
                  </button>
                </form>
                {lookupError && <p className="mt-3 text-sm text-[var(--color-error)]">{lookupError}</p>}
              </div>

              {lookupResult && (
                <div className="min-w-[280px] rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">{lookupResult.name}</p>
                  <p className="text-sm text-[var(--color-muted)] mt-1">{lookupResult.email}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl border border-[var(--color-border)] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Certificates</p>
                      <p className="mt-1 text-xl font-bold text-[var(--color-foreground)]">{lookupResult.totalCertificates}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-[var(--color-border)] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Events</p>
                      <p className="mt-1 text-xl font-bold text-[var(--color-foreground)]">{lookupResult.totalEventsAttended}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {showAdd && (
            <div className="bg-white rounded-2xl border border-[var(--color-primary)] border-dashed p-5">
              <div className="flex gap-3">
                <input value={newName} onChange={(event) => setNewName(event.target.value)} type="text" placeholder="Full Name" className="flex-1 border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]" />
                <input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} type="email" placeholder="Email Address" className="flex-1 border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]" />
                <button onClick={addRecipient} className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)]">Save</button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 border border-[var(--color-border)] rounded-xl text-sm font-medium hover:bg-[var(--color-surface-alt)]">Cancel</button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="relative w-80">
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type="text"
                placeholder="Search by name or email..."
                className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <p className="text-sm text-[var(--color-muted)]">
              <span className="font-semibold text-[var(--color-foreground)]">{filtered.length}</span> recipient{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
            {loading ? (
              <div className="px-6 py-16 text-center text-sm text-[var(--color-muted)]">Loading recipients...</div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--color-surface-alt)]">
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Recipient</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Email</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)] text-center">Events</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Last Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filtered.map((recipient, i) => (
                    <motion.tr key={recipient.id} variants={tableRow} initial="hidden" animate="visible" transition={{ delay: i * 0.03 }} className="hover:bg-[var(--color-surface-alt)]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--color-primary-faint)] flex items-center justify-center text-[var(--color-primary)] text-xs font-bold">
                            {recipient.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-[var(--color-foreground)]">{recipient.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-muted)]">{recipient.email}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-surface-alt)] text-xs font-semibold text-[var(--color-foreground)]">{recipient.events}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-muted)]">{recipient.lastIssued}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
