"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { pageVariants, fadeUp, fadeLeft, headerSlide, pulseGlow } from "@/lib/animations";

/* ─── Types ────────────────────────────────────── */
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: "delivery" | "reminder" | "verification" | "custom";
  updatedAt: string;
}

/* ─── Merge-tag helpers ────────────────────────── */
const MERGE_TAGS = [
  { label: "Recipient Name", tag: "[recipient.name]" },
  { label: "Recipient Email", tag: "[recipient.email]" },
  { label: "Event Name", tag: "[event.name]" },
  { label: "Event Date", tag: "[event.date]" },
  { label: "Certificate Code", tag: "[cert.code]" },
  { label: "PDF Link", tag: "[cert.pdfUrl]" },
  { label: "Verify URL", tag: "[cert.verifyUrl]" },
  { label: "Org Name", tag: "[org.name]" },
];

const CATEGORY_COLORS: Record<EmailTemplate["category"], string> = {
  delivery: "bg-blue-50 text-blue-600",
  reminder: "bg-amber-50 text-amber-600",
  verification: "bg-emerald-50 text-emerald-600",
  custom: "bg-purple-50 text-purple-600",
};

/* ─── Starter templates ────────────────────────── */
const starterTemplates: EmailTemplate[] = [
  {
    id: "mail-delivery",
    name: "Credential Delivery",
    subject: "Your credential for [event.name]",
    body: `Hi [recipient.name],

Congratulations! Your credential for [event.name] is ready.

Event Date: [event.date]
Verification Code: [cert.code]

You can download your certificate using the link below:
[cert.pdfUrl]

To verify this credential at any time, visit:
[cert.verifyUrl]

Best regards,
[org.name]`,
    category: "delivery",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mail-reminder",
    name: "Download Reminder",
    subject: "Reminder: Your [event.name] credential awaits",
    body: `Hi [recipient.name],

This is a friendly reminder that your credential for [event.name] is still available for download.

Don't forget to save it for your records!

Download: [cert.pdfUrl]
Verify: [cert.verifyUrl]

— [org.name]`,
    category: "reminder",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mail-verify",
    name: "Verification Confirmation",
    subject: "Certificate [cert.code] has been verified",
    body: `Hi [recipient.name],

Someone has successfully verified your credential for [event.name].

Credential Code: [cert.code]
Issued: [event.date]

This confirms the authenticity of your achievement.

— [org.name] via Proofsy`,
    category: "verification",
    updatedAt: new Date().toISOString(),
  },
];

/* ─── Email preview rendering ──────────────────── */
const sampleData: Record<string, string> = {
  "[recipient.name]": "Alex Johnson",
  "[recipient.email]": "alex@example.com",
  "[event.name]": "Advanced React Workshop",
  "[event.date]": "April 29, 2026",
  "[cert.code]": "CERT-A1B2C3D4",
  "[cert.pdfUrl]": "https://proofsy.io/download/CERT-A1B2C3D4",
  "[cert.verifyUrl]": "https://proofsy.io/verify?code=CERT-A1B2C3D4",
  "[org.name]": "Proofsy Corp",
};

function renderPreview(text: string): string {
  let rendered = text;
  for (const [tag, value] of Object.entries(sampleData)) {
    rendered = rendered.replaceAll(tag, value);
  }
  return rendered;
}

/* ─── Component ────────────────────────────────── */
export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(starterTemplates);
  const [selectedId, setSelectedId] = useState(starterTemplates[0].id);
  const [showPreview, setShowPreview] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  const selected = templates.find((t) => t.id === selectedId) || templates[0];

  const updateSelected = useCallback(
    (field: keyof EmailTemplate, value: string) => {
      setTemplates((curr) =>
        curr.map((t) =>
          t.id === selectedId
            ? { ...t, [field]: value, updatedAt: new Date().toISOString() }
            : t
        )
      );
    },
    [selectedId]
  );

  const createTemplate = () => {
    const id = `mail-${Date.now()}`;
    const newTemplate: EmailTemplate = {
      id,
      name: "Untitled Template",
      subject: "Subject line here",
      body: "Hi [recipient.name],\n\nYour message body goes here.\n\n— [org.name]",
      category: "custom",
      updatedAt: new Date().toISOString(),
    };
    setTemplates((curr) => [...curr, newTemplate]);
    setSelectedId(id);
  };

  const duplicateTemplate = () => {
    const id = `mail-${Date.now()}`;
    const dup: EmailTemplate = {
      ...selected,
      id,
      name: `${selected.name} (copy)`,
      updatedAt: new Date().toISOString(),
    };
    setTemplates((curr) => [...curr, dup]);
    setSelectedId(id);
  };

  const deleteTemplate = (tid: string) => {
    if (templates.length <= 1) return;
    setTemplates((curr) => curr.filter((t) => t.id !== tid));
    if (selectedId === tid) {
      setSelectedId(templates.find((t) => t.id !== tid)?.id || templates[0].id);
    }
  };

  const insertTag = (tag: string) => {
    updateSelected("body", selected.body + tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1200);
  };

  const handleSave = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-16 right-20 w-52 h-52 bg-pink-200/15 rounded-full blur-3xl pointer-events-none" />
        <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: '1.2s' }} className="absolute bottom-24 left-8 w-48 h-48 bg-violet-200/10 rounded-full blur-3xl pointer-events-none" />

        <motion.header variants={headerSlide} initial="hidden" animate="visible" className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">Email Templates</h2>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">Build, preview and manage credential delivery emails with merge tags.</p>
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {showSaved && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="text-xs font-semibold text-[var(--color-success)] flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  Saved
                </motion.span>
              )}
            </AnimatePresence>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSave} className="border border-[var(--color-border)] text-[var(--color-foreground)] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--color-surface-alt)] cursor-pointer">
              Save Changes
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={createTemplate} className="bg-[var(--color-primary)] text-white px-5 py-2 rounded-xl hover:bg-[var(--color-primary-dark)] font-semibold text-sm shadow-sm cursor-pointer flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              New
            </motion.button>
          </div>
        </motion.header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 grid lg:grid-cols-[280px_1fr] gap-6 relative z-[1]">
          {/* Template List Sidebar */}
          <motion.aside variants={fadeLeft} className="bg-white rounded-2xl border border-[var(--color-border)] p-4 space-y-1.5 h-fit max-h-[calc(100vh-180px)] overflow-y-auto">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)] px-3 mb-2">
              {templates.length} Template{templates.length !== 1 ? "s" : ""}
            </p>
            {templates.map((t) => (
              <motion.button
                key={t.id}
                layout
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left rounded-xl px-4 py-3 border group relative ${
                  selectedId === t.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-faint)]"
                    : "border-transparent hover:bg-[var(--color-surface-alt)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--color-foreground)] truncate pr-2">{t.name}</p>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[t.category]} shrink-0`}>
                    {t.category}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-muted)] mt-1 truncate">{t.subject}</p>
                <p className="text-[10px] text-[var(--color-muted)] opacity-60 mt-1">Updated {formatTime(t.updatedAt)}</p>
                {templates.length > 1 && selectedId === t.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-[var(--color-error)] hover:bg-[var(--color-error-bg)] p-1 rounded cursor-pointer"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                  </button>
                )}
              </motion.button>
            ))}
          </motion.aside>

          {/* Editor */}
          <motion.div variants={fadeUp} className="space-y-5">
            {/* Toolbar */}
            <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[var(--color-foreground)]">Merge Tags</h3>
                <div className="flex gap-2">
                  <button onClick={duplicateTemplate} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] flex items-center gap-1 cursor-pointer">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>
                    Duplicate
                  </button>
                  <button onClick={() => setShowPreview(!showPreview)} className={`text-xs flex items-center gap-1 cursor-pointer ${showPreview ? 'text-[var(--color-primary)] font-semibold' : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                    {showPreview ? "Hide Preview" : "Live Preview"}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MERGE_TAGS.map((mt) => (
                  <motion.button
                    key={mt.tag}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => insertTag(mt.tag)}
                    className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                      copiedTag === mt.tag
                        ? "border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-success)]"
                        : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-faint)]"
                    }`}
                    title={`Insert ${mt.label}`}
                  >
                    {copiedTag === mt.tag ? "✓ Inserted" : mt.tag}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Name + Category row */}
            <div className="grid grid-cols-[1fr_160px] gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Template Name</label>
                <input
                  value={selected.name}
                  onChange={(e) => updateSelected("name", e.target.value)}
                  className="w-full bg-white border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Category</label>
                <select
                  value={selected.category}
                  onChange={(e) => updateSelected("category", e.target.value)}
                  className="w-full bg-white border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                >
                  <option value="delivery">Delivery</option>
                  <option value="reminder">Reminder</option>
                  <option value="verification">Verification</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Subject Line</label>
              <input
                value={selected.subject}
                onChange={(e) => updateSelected("subject", e.target.value)}
                className="w-full bg-white border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 font-mono"
              />
            </div>

            {/* Body + Preview split */}
            <div className={`grid gap-5 ${showPreview ? "lg:grid-cols-2" : ""}`}>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Email Body</label>
                <textarea
                  value={selected.body}
                  onChange={(e) => updateSelected("body", e.target.value)}
                  rows={14}
                  className="w-full bg-white border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 font-mono leading-relaxed resize-none"
                />
                <p className="text-[10px] text-[var(--color-muted)]">
                  {selected.body.length} characters · {selected.body.split("\n").length} lines
                </p>
              </div>

              {/* Live Preview */}
              <AnimatePresence>
                {showPreview && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-1.5"
                  >
                    <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                      Live Preview
                    </label>
                    <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden">
                      {/* Email header preview */}
                      <div className="bg-[var(--color-surface-alt)] px-4 py-3 border-b border-[var(--color-border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-semibold text-[var(--color-muted)] w-10">From:</span>
                          <span className="text-xs text-[var(--color-foreground)]">noreply@proofsy.io</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-semibold text-[var(--color-muted)] w-10">To:</span>
                          <span className="text-xs text-[var(--color-foreground)]">{sampleData["[recipient.email]"]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-[var(--color-muted)] w-10">Subj:</span>
                          <span className="text-xs font-semibold text-[var(--color-foreground)]">{renderPreview(selected.subject)}</span>
                        </div>
                      </div>
                      {/* Body */}
                      <div className="px-4 py-4">
                        <pre className="text-sm text-[var(--color-foreground)] leading-relaxed whitespace-pre-wrap font-sans">{renderPreview(selected.body)}</pre>
                      </div>
                      {/* Footer */}
                      <div className="bg-[var(--color-surface-alt)] px-4 py-2 border-t border-[var(--color-border)] text-center">
                        <p className="text-[9px] text-[var(--color-muted)]">Sent via Proofsy · Unsubscribe</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
