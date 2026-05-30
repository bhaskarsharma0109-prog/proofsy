"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import MetricCard from "@/components/MetricCard";
import { api, CertificateData, EventData, StatsData } from "@/lib/api";
import { pageVariants, staggerContainer, fadeUp, headerSlide, pulseGlow } from "@/lib/animations";

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

function buildMonthlyData(certificates: CertificateData[]) {
  const counts = new Map<string, number>();

  for (const certificate of certificates) {
    const date = new Date(certificate.issuedAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;

    return {
      month: monthFormatter.format(date),
      value: counts.get(key) || 0,
    };
  });
}

export default function AnalyticsPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(true);

  useEffect(() => {
    async function load() {
      const health = await api.health();

      if (!health.success) {
        setBackendOnline(false);
        setLoading(false);
        return;
      }

      const [eventsRes, certificatesRes, statsRes] = await Promise.all([
        api.listEvents(),
        api.listCertificates(),
        api.getStats(),
      ]);

      if (eventsRes.success && eventsRes.data) {
        setEvents(eventsRes.data);
      }

      if (certificatesRes.success && certificatesRes.data) {
        setCertificates(certificatesRes.data);
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      setBackendOnline(true);
      setLoading(false);
    }

    load();
  }, []);

  const kpis = [
    { label: "Credentials Issued", value: stats?.totalCertificates || 0, color: "bg-blue-50 text-blue-600" },
    { label: "Ready To Verify", value: stats?.generated || 0, color: "bg-emerald-50 text-emerald-600" },
    { label: "Coverage Rate", value: stats?.verificationRate || 0, suffix: "%", color: "bg-purple-50 text-purple-600" },
    { label: "Active Recipients", value: stats?.totalUsers || 0, color: "bg-amber-50 text-amber-600" },
  ];
  const monthlyData = buildMonthlyData(certificates);
  const maxValue = Math.max(...monthlyData.map((d) => d.value));
  
  const credentialsPerEvent = stats?.totalEvents 
    ? Math.round((stats.totalCertificates / stats.totalEvents) * 10) / 10 
    : 0;

  const topEvents = (stats?.recentEvents || [])
    .map((event) => {
      const rate = event.totalCertificates
        ? Math.round((event.generatedCertificates / event.totalCertificates) * 100)
        : 0;

      return {
        id: event.id,
        name: event.name,
        certs: event.totalCertificates,
        rate,
      };
    })
    .sort((a, b) => b.certs - a.certs)
    .slice(0, 5);

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-10 right-32 w-64 h-64 bg-indigo-200/15 rounded-full blur-3xl pointer-events-none" />
        <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: '1.5s' }} className="absolute bottom-40 left-20 w-48 h-48 bg-emerald-200/10 rounded-full blur-3xl pointer-events-none" />

        <motion.header variants={headerSlide} initial="hidden" animate="visible" className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">Analytics</h2>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">Track performance and engagement metrics.</p>
          </div>
          <div className="flex items-center gap-2">
            <select className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--color-foreground)] cursor-pointer">
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Last 12 months</option>
              <option>All time</option>
            </select>
            <button className="border border-[var(--color-border)] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-alt)] cursor-pointer flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export
            </button>
          </div>
        </motion.header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 space-y-8 relative z-[1]">
          {!backendOnline && !loading && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
              <p className="text-sm text-amber-800">Backend not available. Analytics is showing empty values until the API comes back online.</p>
            </div>
          )}

          {/* KPIs */}
          <motion.section variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {kpis.map((k) => (
              <motion.div key={k.label} variants={fadeUp} whileHover={{ scale: 1.03, y: -3, transition: { type: 'spring', stiffness: 400, damping: 25 } }}>
                <MetricCard
                  label={k.label}
                  value={k.value}
                  suffix={k.suffix}
                  loading={loading}
                  iconClassName={k.color}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                    </svg>
                  }
                />
              </motion.div>
            ))}
          </motion.section>

          {/* Chart + Top Events */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Bar Chart */}
            <section className="xl:col-span-3 bg-white rounded-2xl border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-[var(--color-foreground)]">Credentials Over Time</h3>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">Issued certificate volume over the last six months</p>
                </div>
                <span className="text-xs font-medium text-[var(--color-muted)]">{credentialsPerEvent} per event</span>
              </div>
              <div className="flex items-end gap-2 h-48">
                {monthlyData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      className="w-full bg-[var(--color-primary)] rounded-t-md hover:bg-[var(--color-primary-dark)] cursor-default"
                      style={{ minHeight: d.value > 0 ? 4 : 0 }}
                      initial={{ height: 0 }}
                      animate={{ height: `${maxValue === 0 ? 0 : (d.value / maxValue) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.3 + i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                      whileHover={{ scaleX: 1.1, transition: { duration: 0.15 } }}
                    />
                    <span className="text-[9px] text-[var(--color-muted)] font-medium">{d.month}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Top Events */}
            <section className="xl:col-span-2 bg-white rounded-2xl border border-[var(--color-border)] p-6">
              <h3 className="text-base font-bold text-[var(--color-foreground)] mb-1">Top Events</h3>
              <p className="text-xs text-[var(--color-muted)] mb-5">By credentials issued</p>
              {topEvents.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-center">
                  <p className="text-sm text-[var(--color-muted)]">Issue a few certificates to unlock event-level analytics.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topEvents.map((e) => (
                    <div key={e.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[var(--color-foreground)] truncate max-w-[60%]">{e.name}</span>
                        <span className="text-xs font-mono text-[var(--color-muted)] tabular-nums">{e.certs}</span>
                      </div>
                      <div className="w-full h-1.5 bg-[var(--color-surface-alt)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-primary)] rounded-full"
                          style={{ width: `${(e.certs / topEvents[0].certs) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </motion.div>

          {/* Verification Rates */}
          <motion.section variants={fadeUp} className="bg-white rounded-2xl border border-[var(--color-border)] p-6">
            <h3 className="text-base font-bold text-[var(--color-foreground)] mb-1">Verification Rates by Event</h3>
            <p className="text-xs text-[var(--color-muted)] mb-5">Current readiness based on generated PDFs per event</p>
            {topEvents.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-center rounded-xl bg-[var(--color-surface-alt)]">
                <p className="text-sm text-[var(--color-muted)]">No events with certificates yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {topEvents.map((e) => (
                  <div key={e.id} className="text-center p-4 rounded-xl bg-[var(--color-surface-alt)]">
                    <div className="relative w-16 h-16 mx-auto mb-3">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-border)" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15" fill="none"
                          stroke="var(--color-primary)" strokeWidth="3"
                          strokeDasharray={`${e.rate * 0.94} ${94 - e.rate * 0.94}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[var(--color-foreground)]">{e.rate}%</span>
                    </div>
                    <p className="text-[11px] font-medium text-[var(--color-foreground)] truncate">{e.name.split(" ").slice(0, 2).join(" ")}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        </motion.div>
      </main>
    </div>
  );
}
