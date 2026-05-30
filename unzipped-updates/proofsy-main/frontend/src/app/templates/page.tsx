"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { TEMPLATE_DEFINITIONS } from "@/lib/templates";
import { trackOnboarding } from "@/lib/onboarding";
import { pageVariants, staggerContainer, fadeUp, headerSlide, scaleUp, pulseGlow } from "@/lib/animations";

function ModernTemplateCardPreview() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-0 h-3 bg-fuchsia-700" />
      <div className="absolute left-0 top-0 h-3 w-8 bg-white [clip-path:polygon(0_0,100%_0,0_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-4 bg-fuchsia-700" />
      <div className="absolute inset-x-0 bottom-4 h-1 bg-neutral-900" />
      <div className="absolute bottom-0 right-8 h-16 w-4 skew-x-[-28deg] bg-neutral-900" />
      <div className="absolute bottom-0 right-3 h-14 w-3 skew-x-[-28deg] bg-neutral-900" />

      <div className="px-8 pt-6">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black leading-none">∞</span>
            <span className="rounded-md border border-slate-200 bg-sky-50 px-1.5 py-1 text-[7px] font-black leading-none text-slate-800">TECH<br />VISION</span>
            <span className="block h-5 w-28 overflow-hidden">
              <img src="/certificate-assets/snist-logo-strip.jpg" alt="NAAC NBA UGC" className="h-5 w-auto max-w-none" />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <img src="/certificate-assets/snist-logo.jpg" alt="Sreenidhi SNIST" className="h-6 w-auto" />
          </div>
        </div>

        <div className="mt-7 text-center">
          <p className="text-[11px] font-black uppercase tracking-wide text-blue-900">The Infinitix Club × Techvision Club</p>
          <p className="mt-1 text-[9px] font-black uppercase text-blue-900">Two-Day Student Training Program</p>
          <p className="text-[8px] font-black text-blue-900">On</p>
          <p className="text-[10px] font-black uppercase text-blue-900">Data Engineering</p>
          <p className="mt-3 font-serif text-[14px] font-black uppercase text-blue-900 underline underline-offset-2">Certificate of Participation</p>
          <div className="mx-auto mt-3 h-1.5 w-40 rounded bg-slate-300" />
          <div className="mx-auto mt-2 h-1.5 w-64 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-20 right-12 w-60 h-60 bg-amber-200/15 rounded-full blur-3xl pointer-events-none" />
        <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: '1.2s' }} className="absolute bottom-28 left-20 w-52 h-52 bg-cyan-200/10 rounded-full blur-3xl pointer-events-none" />

        <motion.header variants={headerSlide} initial="hidden" animate="visible" className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">Design Templates</h2>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">Browse and preview certificate and badge designs for your events.</p>
          </div>
          <Link
            href="/events/new"
            onClick={() => trackOnboarding("viewedTemplates")}
            className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl hover:bg-[var(--color-primary-dark)] font-semibold text-sm shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Use Template
          </Link>
        </motion.header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 relative z-[1]">
          <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {TEMPLATE_DEFINITIONS.map((t) => (
              <motion.div key={t.id} variants={scaleUp} whileHover={{ scale: 1.03, y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }} className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden hover:shadow-lg hover:border-[var(--color-border-strong)] cursor-pointer group">
                {/* Preview */}
                <div className={`bg-gradient-to-br ${t.color} ${t.border} border-b h-48 flex items-center justify-center relative`}>
                  {t.id === "modern" ? (
                    <div className="h-full w-full group-hover:scale-[1.02] transition-transform duration-300">
                      <ModernTemplateCardPreview />
                    </div>
                  ) : (
                    <div className="w-40 h-28 bg-white rounded-lg shadow-md border flex flex-col items-center justify-center gap-2 group-hover:scale-105 transition-transform duration-300">
                      <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center">
                        <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      </div>
                      <div className="w-20 h-1 bg-gray-300 rounded" />
                      <div className="w-28 h-2 bg-gray-400 rounded" />
                      <div className="w-16 h-1 bg-gray-300 rounded" />
                      <div className="flex gap-6 mt-1">
                        <div className="w-8 h-0.5 bg-gray-200" />
                        <div className="w-4 h-4 border border-gray-200 rounded-sm" />
                        <div className="w-8 h-0.5 bg-gray-200" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-[var(--color-foreground)]">{t.name}</h3>
                    <div className="flex gap-1.5">
                      {t.tags.map((tag) => (
                        <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-muted)]">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">{t.desc}</p>
                  <div className="mt-4 flex gap-2">
                    <Link href={`/templates/${t.id}`} className="flex-1 text-center py-2 border border-[var(--color-border)] rounded-lg text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface-alt)] cursor-pointer">
                      Preview
                    </Link>
                    <Link
                      href={`/events/new?template=${encodeURIComponent(t.id)}`}
                      onClick={() => {
                        trackOnboarding("viewedTemplates");
                        trackOnboarding("selectedTemplate");
                      }}
                      className="flex-1 text-center py-2 bg-[var(--color-primary)] text-white rounded-lg text-xs font-semibold hover:bg-[var(--color-primary-dark)] cursor-pointer"
                    >
                      Use this
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
