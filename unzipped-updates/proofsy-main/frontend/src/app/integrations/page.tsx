"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { pageVariants, staggerContainer, fadeUp, headerSlide, cardHover, pulseGlow } from "@/lib/animations";

const starterIntegrations = [
  { name: "Zapier", desc: "Connect Proofsy with 5,000+ apps using automated workflows.", icon: "⚡", category: "Automation", status: "available" as const },
  { name: "Webhooks", desc: "Send real-time event data to any URL endpoint.", icon: "🔗", category: "Developer", status: "available" as const },
  { name: "Google Sheets", desc: "Sync recipient data directly from Google Sheets.", icon: "📊", category: "Data", status: "available" as const },
  { name: "Slack", desc: "Get notifications when credentials are issued or verified.", icon: "💬", category: "Communication", status: "coming" as const },
  { name: "HubSpot", desc: "Sync credential data with your CRM contacts.", icon: "🎯", category: "CRM", status: "coming" as const },
  { name: "REST API", desc: "Full API access for custom integrations and workflows.", icon: "🛠️", category: "Developer", status: "available" as const },
];

export default function IntegrationsPage() {
  const [connected, setConnected] = useState<Record<string, boolean>>({
    Webhooks: true,
  });
  const [watchlist, setWatchlist] = useState<Record<string, boolean>>({});

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-20 right-10 w-56 h-56 bg-blue-200/15 rounded-full blur-3xl pointer-events-none" />
        <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: '1s' }} className="absolute bottom-20 left-32 w-64 h-64 bg-purple-200/10 rounded-full blur-3xl pointer-events-none" />

        <motion.header variants={headerSlide} initial="hidden" animate="visible" className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5">
          <h2 className="text-xl font-bold text-[var(--color-foreground)]">Integrations</h2>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Connect Proofsy with your favorite tools and services.</p>
        </motion.header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 relative z-[1]">
          <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {starterIntegrations.map((integration) => {
              const isConnected = connected[integration.name];
              const isWatching = watchlist[integration.name];

              return (
                <motion.div key={integration.name} variants={fadeUp} whileHover={cardHover} className="bg-white rounded-2xl border border-[var(--color-border)] p-6 hover:shadow-md hover:border-[var(--color-border-strong)]">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-alt)] flex items-center justify-center text-2xl">{integration.icon}</div>
                    {integration.status === "coming" ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Coming Soon</span>
                    ) : isConnected ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]">Connected</span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-muted)]">Available</span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[var(--color-foreground)] mb-1">{integration.name}</h3>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed mb-4">{integration.desc}</p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-muted)]">{integration.category}</span>
                    {integration.status === "available" ? (
                      <button
                        onClick={() => setConnected((current) => ({ ...current, [integration.name]: !current[integration.name] }))}
                        className={`text-xs font-semibold px-4 py-1.5 rounded-lg ${isConnected ? "border border-[var(--color-border)] text-[var(--color-foreground)]" : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"}`}
                      >
                        {isConnected ? "Disconnect" : "Connect"}
                      </button>
                    ) : (
                      <button
                        onClick={() => setWatchlist((current) => ({ ...current, [integration.name]: !current[integration.name] }))}
                        className="text-xs font-semibold px-4 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-muted)]"
                      >
                        {isWatching ? "Watching" : "Notify Me"}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
