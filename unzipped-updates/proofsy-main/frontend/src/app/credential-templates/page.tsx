"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { TEMPLATE_DEFINITIONS } from "@/lib/templates";
import { trackOnboarding } from "@/lib/onboarding";
import { pageVariants, staggerContainer, fadeUp, headerSlide, cardHover, pulseGlow } from "@/lib/animations";

export default function CredentialTemplatesPage() {
  const [query, setQuery] = useState("");
  const templates = useMemo(
    () =>
      TEMPLATE_DEFINITIONS.filter((template) =>
        `${template.name} ${template.tags.join(" ")} ${template.desc}`.toLowerCase().includes(query.toLowerCase())
      ).map((template) => ({
        ...template,
        created: "Apr 29, 2026",
        credentials: 0,
        hasDetails: true,
      })),
    [query]
  );

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-24 right-28 w-56 h-56 bg-orange-200/15 rounded-full blur-3xl pointer-events-none" />
        <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: '1.3s' }} className="absolute bottom-32 left-16 w-48 h-48 bg-violet-200/10 rounded-full blur-3xl pointer-events-none" />

        <motion.header variants={headerSlide} initial="hidden" animate="visible" className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">Credential Templates</h2>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">Manage your certificate and badge configurations.</p>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl hover:bg-[var(--color-primary-dark)] font-semibold text-sm shadow-sm flex items-center gap-2 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Create Credential Template
          </motion.button>
        </motion.header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 relative z-[1]">
          {/* Filters */}
          <div className="flex items-center gap-3 mb-6">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)] cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" /></svg>
              Newest Created
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)] cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" /></svg>
              Filter
            </button>
            <div className="ml-auto flex items-center gap-3">
              <div className="relative">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                <input type="text" placeholder="Search credential templa..." className="border border-[var(--color-border)] rounded-lg pl-9 pr-4 py-1.5 text-xs w-56 focus:outline-none focus:border-[var(--color-primary)]" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} type="text" placeholder="Search credential templates..." className="border border-[var(--color-border)] rounded-lg pl-9 pr-4 py-1.5 text-xs w-56 focus:outline-none focus:border-[var(--color-primary)]" />
              </div>
              <span className="text-xs text-[var(--color-muted)]">{templates.length} / {TEMPLATE_DEFINITIONS.length}</span>
              <span className="text-xs text-[var(--color-muted)]">100 / page</span>
            </div>
          </div>

          {/* Info bar */}
          <p className="text-sm text-[var(--color-muted)] mb-4">{templates.length} credential template{templates.length !== 1 ? "s" : ""}</p>

          {/* Templates list */}
          <motion.div variants={staggerContainer} className="space-y-3">
            {templates.map((t) => (
              <motion.div key={t.id} variants={fadeUp} whileHover={cardHover} className="bg-white rounded-2xl border border-[var(--color-border)] p-5 flex items-center gap-5 hover:shadow-md hover:border-[var(--color-border-strong)] cursor-pointer group">
                {/* Badge preview */}
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-100 to-red-100 border border-orange-200 flex items-center justify-center shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-white border border-orange-200 flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.996.178-1.768.563-2.129 1.142a3.11 3.11 0 0 0 0 3.244c.36.579 1.133.964 2.129 1.142M18.75 4.236c.996.178 1.768.563 2.129 1.142a3.11 3.11 0 0 1 0 3.244c-.36.579-1.133.964-2.129 1.142" />
                    </svg>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">{t.name}</h3>
                  <p className="text-xs text-[var(--color-muted)] mt-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                    Created {t.created}
                  </p>
                  <Link href={`/templates/${t.id}`} className="text-xs text-[var(--color-primary)] font-medium mt-2 inline-flex items-center gap-1 hover:underline">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 4.5 7.5 7.5-7.5 7.5m-6-15h12" /></svg>
                    Preview Template
                  </Link>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <button className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" /></svg>
                  </button>
                  <Link href="/certificates" className="border border-[var(--color-border)] px-4 py-1.5 rounded-lg text-xs font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)] cursor-pointer flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                    View Credentials
                  </Link>
                  <Link
                    href={`/events/new?template=${encodeURIComponent(t.id)}`}
                    onClick={() => {
                      trackOnboarding("viewedTemplates");
                      trackOnboarding("selectedTemplate");
                    }}
                    className="bg-[var(--color-primary)] text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--color-primary-dark)] cursor-pointer flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Issue Credentials
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
