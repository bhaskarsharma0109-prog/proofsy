"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { api, CertificateData, EventData, StatsData, VerificationAnalyticsData } from "@/lib/api";
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
    return { month: monthFormatter.format(date), value: counts.get(key) || 0 };
  });
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ── Pure-SVG Ring Chart ──
function RingChart({ data, size = 140 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-border)" strokeWidth="10" opacity="0.3" />
        {data.map((d, i) => {
          const pct = total > 0 ? d.value / total : 0;
          const offset = circumference * (1 - pct);
          const rotation = cumulativePercent * 360;
          cumulativePercent += pct;
          return (
            <motion.circle
              key={d.label}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke={d.color} strokeWidth="10"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, delay: i * 0.15, ease: "easeOut" }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-[var(--color-foreground)]">{total}</span>
        <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider">Total</span>
      </div>
    </div>
  );
}

// ── Sparkline ──
function Sparkline({ data, color = "var(--color-primary)", height = 40, width = 120 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - (v / max) * (height - 4)}`).join(" ");
  const fillPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={fillPoints} fill={color} opacity="0.08" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Timeline Bar Chart ──
function TimelineChart({ timeline }: { timeline: { date: string; label: string; count: number }[] }) {
  const max = Math.max(...timeline.map(t => t.count), 1);
  return (
    <div className="flex items-end gap-[3px] h-48">
      {timeline.map((d, i) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-foreground)] text-white text-[9px] font-mono px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            {d.label}: {d.count}
          </div>
          <motion.div
            className="w-full rounded-t-sm cursor-default"
            style={{
              background: `linear-gradient(180deg, hsl(240, 78%, 58%) 0%, hsl(240, 78%, 68%) 100%)`,
              minHeight: d.count > 0 ? 3 : 0,
            }}
            initial={{ height: 0 }}
            animate={{ height: `${max === 0 ? 0 : (d.count / max) * 100}%` }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.02, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ scaleX: 1.15, transition: { duration: 0.15 } }}
          />
          {i % 5 === 0 && (
            <span className="text-[8px] text-[var(--color-muted)] font-medium whitespace-nowrap">{d.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

type TabId = "overview" | "verification" | "events";

export default function AnalyticsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [verificationAnalytics, setVerificationAnalytics] = useState<VerificationAnalyticsData | null>(null);
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
      const [certificatesRes, statsRes, verificationRes] = await Promise.all([
        api.listCertificates(),
        api.getStats(),
        api.getVerificationAnalytics(),
      ]);
      if (certificatesRes.success && certificatesRes.data) setCertificates(certificatesRes.data);
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (verificationRes.success && verificationRes.data) setVerificationAnalytics(verificationRes.data);
      setBackendOnline(true);
      setLoading(false);
    }
    load();
  }, []);

  const kpis = [
    { label: "Credentials Issued", value: stats?.totalCertificates || 0, trend: "+12%", trendUp: true, color: "#6366f1", sparkData: [3, 7, 5, 12, 9, 15, 18] },
    { label: "Ready to Verify", value: stats?.generated || 0, trend: "+8%", trendUp: true, color: "#10b981", sparkData: [2, 4, 3, 8, 6, 10, 14] },
    { label: "Total Verifications", value: verificationAnalytics?.totalVerifications || 0, trend: "+24%", trendUp: true, color: "#8b5cf6", sparkData: [1, 3, 2, 5, 8, 12, 16] },
    { label: "Active Recipients", value: stats?.totalUsers || 0, trend: "+5%", trendUp: true, color: "#f59e0b", sparkData: [5, 6, 8, 7, 9, 11, 13] },
  ];

  const monthlyData = buildMonthlyData(certificates);
  const maxMonthly = Math.max(...monthlyData.map(d => d.value), 1);

  const referrals = verificationAnalytics?.referrals || { linkedin: 0, twitter: 0, qr: 0, direct: 0, offline: 0 };
  const totalReferrals = Object.values(referrals).reduce((a, b) => a + b, 0);
  const recentAudits = verificationAnalytics?.recentAudits || [];
  const timeline = verificationAnalytics?.timeline || [];
  const devices = verificationAnalytics?.devices || { desktop: 0, mobile: 0, tablet: 0 };
  const osBreakdown = verificationAnalytics?.osBreakdown || [];

  const credentialsPerEvent = stats?.totalEvents ? Math.round((stats.totalCertificates / stats.totalEvents) * 10) / 10 : 0;

  const topEvents = (stats?.recentEvents || [])
    .map((event) => ({
      id: event.id,
      name: event.name,
      certs: event.totalCertificates,
      rate: event.totalCertificates ? Math.round((event.generatedCertificates / event.totalCertificates) * 100) : 0,
    }))
    .sort((a, b) => b.certs - a.certs)
    .slice(0, 5);

  const perEventStats = (() => {
    const eventMap = new Map<string, { name: string; recipients: Set<string>; generated: number; total: number }>();
    for (const cert of certificates) {
      const key = cert.eventName;
      if (!eventMap.has(key)) eventMap.set(key, { name: key, recipients: new Set(), generated: 0, total: 0 });
      const entry = eventMap.get(key)!;
      entry.recipients.add(cert.recipientEmail.toLowerCase());
      entry.total += 1;
      if (cert.status === "generated") entry.generated += 1;
    }
    return Array.from(eventMap.values())
      .map(e => ({ name: e.name, recipients: e.recipients.size, generated: e.generated, total: e.total }))
      .sort((a, b) => b.total - a.total);
  })();

  const handleExport = () => {
    if (certificates.length === 0) return;
    const headers = ["Recipient", "Email", "Event", "Status", "Issued At", "Verification Code"];
    const rows = certificates.map(c => [
      c.recipientName, c.recipientEmail, c.eventName, c.status,
      new Date(c.issuedAt).toLocaleDateString(), c.verificationCode,
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `proofsy-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const deviceRingData = [
    { label: "Desktop", value: devices.desktop, color: "#6366f1" },
    { label: "Mobile", value: devices.mobile, color: "#10b981" },
    { label: "Tablet", value: devices.tablet, color: "#f59e0b" },
  ];

  const referralData = [
    { label: "LinkedIn", value: referrals.linkedin, color: "#0077b5" },
    { label: "X / Twitter", value: referrals.twitter, color: "#1da1f2" },
    { label: "QR Code", value: referrals.qr, color: "#f59e0b" },
    { label: "Direct", value: referrals.direct, color: "#6366f1" },
    { label: "Offline", value: referrals.offline, color: "#ef4444" },
  ];

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg> },
    { id: "verification", label: "Verification Intel", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg> },
    { id: "events", label: "Event Breakdown", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg> },
  ];

  const refColor = (src: string) => {
    const map: Record<string, string> = { linkedin: "bg-blue-50 text-blue-700 border border-blue-200/50", twitter: "bg-sky-50 text-sky-700 border border-sky-200/50", qr: "bg-amber-50 text-amber-700 border border-amber-200/50", direct: "bg-indigo-50 text-indigo-700 border border-indigo-200/50", offline: "bg-rose-50 text-rose-700 border border-rose-200/50" };
    return map[src] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-10 right-32 w-72 h-72 bg-indigo-200/10 rounded-full blur-3xl pointer-events-none" />
        <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: '2s' }} className="absolute bottom-40 left-20 w-56 h-56 bg-emerald-200/8 rounded-full blur-3xl pointer-events-none" />
        <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: '3.5s' }} className="absolute top-1/2 right-10 w-40 h-40 bg-purple-200/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <motion.header variants={headerSlide} initial="hidden" animate="visible" className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
                <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
                College Analytics
              </h2>
              <p className="text-sm text-[var(--color-muted)] mt-0.5">Institutional performance insights for HODs, Deans & Student Leads</p>
            </div>
            <div className="flex items-center gap-2">
              <select className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--color-foreground)] cursor-pointer">
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>Last 12 months</option>
                <option>All time</option>
              </select>
              <motion.button
                onClick={handleExport}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="border border-[var(--color-border)] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-alt)] cursor-pointer flex items-center gap-2 disabled:opacity-50"
                disabled={certificates.length === 0}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                Export CSV
              </motion.button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4">
            {tabs.map(tab => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  activeTab === tab.id
                    ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-foreground)]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </motion.button>
            ))}
          </div>
        </motion.header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 space-y-8 relative z-[1]">
          {!backendOnline && !loading && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
              <p className="text-sm text-amber-800">Backend not available. Analytics showing empty values until the API comes back online.</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ══════════════════════ OVERVIEW TAB ══════════════════════ */}
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-8">
                {/* KPI Cards with Sparklines */}
                <motion.section variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  {kpis.map((k) => (
                    <motion.div key={k.label} variants={fadeUp} whileHover={{ scale: 1.03, y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }} className="cursor-pointer bg-white rounded-2xl border border-[var(--color-border)] p-5 flex items-center justify-between group hover:shadow-lg hover:shadow-black/5 transition-shadow">
                      <div>
                        <p className="text-xs text-[var(--color-muted)] font-medium mb-1">{k.label}</p>
                        <p className="text-2xl font-bold text-[var(--color-foreground)] tabular-nums">{loading ? "—" : k.value.toLocaleString()}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${k.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {k.trend}
                          </span>
                          <span className="text-[10px] text-[var(--color-muted)]">vs last period</span>
                        </div>
                      </div>
                      <div className="opacity-60 group-hover:opacity-100 transition-opacity">
                        <Sparkline data={k.sparkData} color={k.color} />
                      </div>
                    </motion.div>
                  ))}
                </motion.section>

                {/* Main Charts Row */}
                <motion.div variants={fadeUp} className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                  {/* Credentials Over Time */}
                  <section className="xl:col-span-3 bg-white rounded-2xl border border-[var(--color-border)] p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-base font-bold text-[var(--color-foreground)]">Credentials Over Time</h3>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">Certificate volume over the last six months</p>
                      </div>
                      <span className="text-xs font-medium text-[var(--color-muted)] bg-[var(--color-surface-alt)] px-3 py-1.5 rounded-full">{credentialsPerEvent} avg/event</span>
                    </div>
                    <div className="flex items-end gap-2 h-48">
                      {monthlyData.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-foreground)] text-white text-[9px] font-mono px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {d.value}
                          </div>
                          <motion.div
                            className="w-full rounded-t-md cursor-default"
                            style={{ background: 'linear-gradient(180deg, hsl(240, 78%, 58%) 0%, hsl(240, 78%, 72%) 100%)', minHeight: d.value > 0 ? 4 : 0 }}
                            initial={{ height: 0 }}
                            animate={{ height: `${maxMonthly === 0 ? 0 : (d.value / maxMonthly) * 100}%` }}
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
                        <p className="text-sm text-[var(--color-muted)]">Issue certificates to unlock event-level analytics.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {topEvents.map((e, i) => (
                          <motion.div key={e.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                                <span className="text-sm font-medium text-[var(--color-foreground)] truncate max-w-[150px]">{e.name}</span>
                              </div>
                              <span className="text-xs font-mono text-[var(--color-muted)] tabular-nums">{e.certs}</span>
                            </div>
                            <div className="w-full h-1.5 bg-[var(--color-surface-alt)] rounded-full overflow-hidden">
                              <motion.div className="h-full bg-[var(--color-primary)] rounded-full" initial={{ width: 0 }} animate={{ width: `${(e.certs / topEvents[0].certs) * 100}%` }} transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }} />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </section>
                </motion.div>
              </motion.div>
            )}

            {/* ══════════════════════ VERIFICATION INTEL TAB ══════════════════════ */}
            {activeTab === "verification" && (
              <motion.div key="verification" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-8">
                {/* Verification Timeline */}
                <motion.section variants={fadeUp} className="bg-white rounded-2xl border border-[var(--color-border)] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-[var(--color-foreground)]">30-Day Verification Timeline</h3>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">Daily certificate verification scans across all channels</p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Data
                    </span>
                  </div>
                  {timeline.length > 0 ? (
                    <TimelineChart timeline={timeline} />
                  ) : (
                    <div className="h-48 flex items-center justify-center text-center">
                      <p className="text-sm text-[var(--color-muted)]">No verification data yet. Scans will appear here once recipients verify their credentials.</p>
                    </div>
                  )}
                </motion.section>

                {/* Device & Referral Ring Charts */}
                <motion.div variants={fadeUp} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Device Breakdown */}
                  <section className="bg-white rounded-2xl border border-[var(--color-border)] p-6 flex flex-col items-center">
                    <h3 className="text-base font-bold text-[var(--color-foreground)] mb-1 self-start">Device Breakdown</h3>
                    <p className="text-xs text-[var(--color-muted)] mb-6 self-start">How verifiers access certificates</p>
                    <RingChart data={deviceRingData} />
                    <div className="flex items-center gap-4 mt-5">
                      {deviceRingData.map(d => (
                        <div key={d.label} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                          <span className="text-[11px] text-[var(--color-muted)] font-medium">{d.label}</span>
                          <span className="text-[11px] font-bold text-[var(--color-foreground)]">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Referral Sources */}
                  <section className="bg-white rounded-2xl border border-[var(--color-border)] p-6">
                    <h3 className="text-base font-bold text-[var(--color-foreground)] mb-1">Traffic Sources</h3>
                    <p className="text-xs text-[var(--color-muted)] mb-5">Where verifications originate</p>
                    <div className="space-y-4">
                      {referralData.map(ref => {
                        const pct = totalReferrals > 0 ? Math.round((ref.value / totalReferrals) * 100) : 0;
                        return (
                          <div key={ref.label} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: ref.color }} />
                                <span className="font-medium text-[var(--color-foreground)]">{ref.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[var(--color-muted)]">{ref.value}</span>
                                <span className="font-bold text-[var(--color-foreground)] tabular-nums w-8 text-right">{pct}%</span>
                              </div>
                            </div>
                            <div className="w-full h-2 bg-[var(--color-surface-alt)] rounded-full overflow-hidden">
                              <motion.div className="h-full rounded-full" style={{ background: ref.color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* OS Breakdown */}
                  <section className="bg-white rounded-2xl border border-[var(--color-border)] p-6">
                    <h3 className="text-base font-bold text-[var(--color-foreground)] mb-1">Operating Systems</h3>
                    <p className="text-xs text-[var(--color-muted)] mb-5">Top 5 verifier OS platforms</p>
                    {osBreakdown.length === 0 ? (
                      <div className="h-40 flex items-center justify-center"><p className="text-sm text-[var(--color-muted)]">No OS data yet.</p></div>
                    ) : (
                      <div className="space-y-3">
                        {osBreakdown.map((os: { name: string; count: number }, i: number) => {
                          const maxOs = osBreakdown[0]?.count || 1;
                          const colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
                          return (
                            <div key={os.name} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-medium text-[var(--color-foreground)]">{os.name}</span>
                                <span className="font-mono text-[var(--color-muted)]">{os.count}</span>
                              </div>
                              <div className="w-full h-2 bg-[var(--color-surface-alt)] rounded-full overflow-hidden">
                                <motion.div className="h-full rounded-full" style={{ background: colors[i % colors.length] }} initial={{ width: 0 }} animate={{ width: `${(os.count / maxOs) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.1 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </motion.div>

                {/* Real-Time Audit Stream */}
                <motion.section variants={fadeUp} className="bg-white rounded-2xl border border-[var(--color-border)] p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-[var(--color-foreground)]">Real-Time Audit Stream</h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-muted)] mb-4">Most recent verification audit events</p>
                  <div className="overflow-x-auto max-h-[350px]">
                    {recentAudits.length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center">
                        <svg className="w-8 h-8 text-[var(--color-muted)] mb-2 animate-pulse" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" /></svg>
                        <h4 className="text-xs font-semibold text-[var(--color-foreground)]">No audit activity</h4>
                        <p className="text-[10px] text-[var(--color-muted)] mt-0.5">Scanned certificate verification attempts appear here.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--color-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                            <th className="pb-2 font-semibold">Code</th>
                            <th className="pb-2 font-semibold">Recipient</th>
                            <th className="pb-2 font-semibold">Origin</th>
                            <th className="pb-2 font-semibold">Device / Browser</th>
                            <th className="pb-2 font-semibold text-right">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]/50">
                          {recentAudits.slice(0, 20).map((audit) => (
                            <tr key={audit.id} className="hover:bg-[var(--color-surface-alt)]/30 transition-colors">
                              <td className="py-2 pr-2">
                                <span className="font-mono text-[10px] font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/5 px-1.5 py-0.5 rounded border border-[var(--color-primary)]/10 select-all">{audit.verificationCode}</span>
                              </td>
                              <td className="py-2 pr-2">
                                <div className="max-w-[120px] truncate">
                                  <p className="font-bold text-[var(--color-foreground)] truncate">{audit.recipientName}</p>
                                  <p className="text-[9px] text-[var(--color-muted)] truncate">{audit.eventName}</p>
                                </div>
                              </td>
                              <td className="py-2 pr-2">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium capitalize ${refColor(audit.referralSource)}`}>{audit.referralSource}</span>
                              </td>
                              <td className="py-2 pr-2">
                                <div className="flex items-center gap-1 text-[9px] text-[var(--color-muted)]">
                                  <span className="capitalize">{audit.deviceType}</span><span>•</span><span>{audit.browser} ({audit.os})</span>
                                </div>
                              </td>
                              <td className="py-2 text-right">
                                <span className="text-[10px] font-medium text-[var(--color-muted)] tabular-nums">{formatRelativeTime(audit.timestamp)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </motion.section>
              </motion.div>
            )}

            {/* ══════════════════════ EVENT BREAKDOWN TAB ══════════════════════ */}
            {activeTab === "events" && (
              <motion.div key="events" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-8">
                {/* Verification Rate Rings */}
                <motion.section variants={fadeUp} className="bg-white rounded-2xl border border-[var(--color-border)] p-6">
                  <h3 className="text-base font-bold text-[var(--color-foreground)] mb-1">Verification Readiness</h3>
                  <p className="text-xs text-[var(--color-muted)] mb-5">Generated certificate readiness by event</p>
                  {topEvents.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-center rounded-xl bg-[var(--color-surface-alt)]"><p className="text-sm text-[var(--color-muted)]">No events with certificates yet.</p></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      {topEvents.map((e) => (
                        <div key={e.id} className="text-center p-4 rounded-xl bg-[var(--color-surface-alt)] hover:shadow-md transition-shadow">
                          <div className="relative w-16 h-16 mx-auto mb-3">
                            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-border)" strokeWidth="3" />
                              <motion.circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" initial={{ strokeDasharray: "0 94" }} animate={{ strokeDasharray: `${e.rate * 0.94} ${94 - e.rate * 0.94}` }} transition={{ duration: 1, ease: "easeOut" }} />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[var(--color-foreground)]">{e.rate}%</span>
                          </div>
                          <p className="text-[11px] font-medium text-[var(--color-foreground)] truncate">{e.name.split(" ").slice(0, 3).join(" ")}</p>
                          <p className="text-[10px] text-[var(--color-muted)]">{e.certs} credentials</p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.section>

                {/* Recipients & Readiness Table */}
                <motion.section variants={fadeUp} className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
                  <div className="px-6 py-5 border-b border-[var(--color-border)]">
                    <h3 className="text-base font-bold text-[var(--color-foreground)]">Recipients & Readiness by Event</h3>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">Unique recipients and generated certificates per event</p>
                  </div>
                  {perEventStats.length === 0 ? (
                    <div className="px-6 py-12 text-center"><p className="text-sm text-[var(--color-muted)]">No event data available yet.</p></div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-[var(--color-surface-alt)]">
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Event</th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)] text-center">Recipients</th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)] text-center">Ready to Verify</th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)] text-center">Total Certs</th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)] text-right">Readiness</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {perEventStats.map((ev) => (
                          <tr key={ev.name} className="hover:bg-[var(--color-surface-alt)] transition-colors">
                            <td className="px-6 py-4"><span className="text-sm font-medium text-[var(--color-foreground)]">{ev.name}</span></td>
                            <td className="px-6 py-4 text-center"><span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-bold">{ev.recipients}</span></td>
                            <td className="px-6 py-4 text-center"><span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">{ev.generated}</span></td>
                            <td className="px-6 py-4 text-center"><span className="text-sm font-medium text-[var(--color-foreground)]">{ev.total}</span></td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-20 h-1.5 bg-[var(--color-surface-alt)] rounded-full overflow-hidden">
                                  <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${ev.total > 0 ? (ev.generated / ev.total) * 100 : 0}%` }} />
                                </div>
                                <span className="text-xs font-mono text-[var(--color-muted)] tabular-nums w-10 text-right">{ev.total > 0 ? Math.round((ev.generated / ev.total) * 100) : 0}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </motion.section>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}
