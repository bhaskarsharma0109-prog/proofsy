"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import MetricCard from "@/components/MetricCard";
import { api, CertificateData, EventData, StatsData } from "@/lib/api";
import { pageVariants, staggerContainer, fadeUp, headerSlide, tableRow, float, pulseGlow } from "@/lib/animations";

export default function AdminDashboard() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(true);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [eventMessage, setEventMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const health = await api.health();
      if (!health.success) {
        setBackendOnline(false);
        setLoading(false);
        return;
      }
      setBackendOnline(true);
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

      setLoading(false);
    }
    load();
  }, []);

  const metrics = [
    { label: "Total Events", value: stats?.totalEvents || 0, icon: "calendar", color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
    { label: "Certificates Issued", value: stats?.totalCertificates || 0, icon: "doc", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
    { label: "Recipients", value: stats?.totalUsers || 0, icon: "users", color: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" },
    { label: "Ready To Verify", value: stats?.verificationRate || 0, suffix: "%", icon: "shield", color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
  ];

  const iconMap: Record<string, React.ReactNode> = {
    calendar: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>,
    doc: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>,
    users: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>,
    shield: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>,
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    const confirmed = window.confirm(`Delete "${eventName}" and its related certificates?`);
    if (!confirmed) return;

    setDeletingEventId(eventId);
    setEventMessage(null);

    const res = await api.deleteEvent(eventId);

    if (!res.success) {
      setEventMessage(res.error || "Failed to delete event.");
      setDeletingEventId(null);
      return;
    }

    setEvents((current) => current.filter((event) => event.id !== eventId));
    setCertificates((current) => current.filter((certificate) => certificate.eventName !== eventName));
    setEventMessage(`Deleted "${eventName}" successfully.`);
    setDeletingEventId(null);
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        {/* Decorative background orbs */}
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-20 right-20 w-72 h-72 bg-blue-200/20 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: '1s' }} className="absolute top-60 left-10 w-56 h-56 bg-purple-200/15 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <motion.div variants={float} animate="animate" className="absolute bottom-20 right-40 w-40 h-40 bg-emerald-200/10 dark:bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <motion.header
          variants={headerSlide}
          initial="hidden"
          animate="visible"
          className="sticky top-0 z-10 bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5 flex items-center justify-between"
        >
          <div>
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">Dashboard</h2>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">Your certificate pipeline at a glance.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/recipient/login"
              className="border border-[var(--color-border)] text-[var(--color-foreground)] px-5 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] font-semibold text-sm"
            >
              Recipient Login
            </Link>
            <Link
              href="/events/new"
              className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl hover:bg-[var(--color-primary-dark)] font-semibold text-sm shadow-sm hover:shadow flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              New Event
            </Link>
          </div>
        </motion.header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 space-y-8 relative z-[1]">
          {/* Backend status banner */}
          {!backendOnline && !loading && (
            <div className="bg-[var(--color-warning-bg)] border border-amber-200 dark:border-amber-900/50 rounded-xl px-5 py-3 flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
              <p className="text-sm text-amber-800 dark:text-amber-500">Backend not available. Showing empty data. Start the backend with <code className="bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded text-xs font-mono">npm run dev</code> in the <code className="bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded text-xs font-mono">backend/</code> folder.</p>
            </div>
          )}

          {/* Metrics */}
          <motion.section variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {metrics.map((m) => (
              <motion.div key={m.label} variants={fadeUp} whileHover={{ scale: 1.03, y: -3, transition: { type: 'spring', stiffness: 400, damping: 25 } }}>
                <MetricCard
                  label={m.label}
                  value={m.value}
                  suffix={m.suffix}
                  icon={iconMap[m.icon]}
                  iconClassName={m.color}
                  loading={loading}
                />
              </motion.div>
            ))}
          </motion.section>

          {/* Events Table */}
          <motion.section variants={fadeUp} className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
            <div className="px-6 py-5 flex items-center justify-between border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--color-foreground)]">Recent Events</h3>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">Manage and track certificate issuance</p>
              </div>
              <Link href="/events/new" className="text-sm font-medium text-[var(--color-primary)] hover:underline cursor-pointer">
                Create new →
              </Link>
            </div>

            {eventMessage && (
              <div className="px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm text-[var(--color-muted)]">
                {eventMessage}
              </div>
            )}

            {loading ? (
              <div className="px-6 py-12 text-center">
                <svg className="w-6 h-6 animate-spin mx-auto text-[var(--color-muted)]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                <p className="text-sm text-[var(--color-muted)] mt-3">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg className="w-12 h-12 mx-auto text-[var(--color-muted)] opacity-30 mb-4" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                <p className="text-sm font-medium text-[var(--color-foreground)]">No events yet</p>
                <p className="text-xs text-[var(--color-muted)] mt-1">Create your first event to start issuing certificates.</p>
                <Link href="/events/new" className="inline-flex items-center gap-2 mt-4 bg-[var(--color-primary)] text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Create Event
                </Link>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--color-surface-alt)]">
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Event</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Date</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Organizer</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)] text-right">Created</th>
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {events.map((e, i) => (
                    <motion.tr key={e.id} variants={tableRow} initial="hidden" animate="visible" transition={{ delay: i * 0.05 }} className="hover:bg-[var(--color-surface-alt)] group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">{e.name}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-muted)]">{formatDate(e.date)}</td>
                      <td className="px-6 py-4 text-sm text-[var(--color-muted)]">{e.organizerName}</td>
                      <td className="px-6 py-4 text-sm text-[var(--color-muted)] text-right">{formatDate(e.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteEvent(e.id, e.name)}
                          disabled={deletingEventId === e.id}
                          className="text-sm font-medium text-[var(--color-error)] hover:underline disabled:opacity-50"
                        >
                          {deletingEventId === e.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </motion.section>
        </motion.div>
      </main>
    </div>
  );
}
