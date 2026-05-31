"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { api, AuditLogData } from "@/lib/api";
import { pageVariants, staggerContainer, fadeUp, headerSlide } from "@/lib/animations";

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

function getActionBadgeStyle(action: string) {
  switch (action) {
    case "certificate_issued":
      return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
    case "certificate_revoked":
      return "bg-rose-500/10 text-rose-500 border border-rose-500/20";
    case "template_created":
    case "event_created":
      return "bg-sky-500/10 text-sky-500 border border-sky-500/20";
    case "template_updated":
    case "event_updated":
      return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
    case "template_deleted":
    case "event_deleted":
    case "font_deleted":
      return "bg-red-500/10 text-red-500 border border-red-500/20";
    case "font_uploaded":
      return "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20";
    case "rest_api_toggled":
      return "bg-violet-500/10 text-violet-500 border border-violet-500/20";
    default:
      return "bg-gray-500/10 text-gray-500 border border-gray-500/20";
  }
}

function getActionLabel(action: string) {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function CompliancePage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(true);

  // Filter states
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedActor, setSelectedActor] = useState("");
  
  // Modal/Detail states
  const [activeLog, setActiveLog] = useState<AuditLogData | null>(null);

  // Unique lists for filtering dropdowns derived from loaded logs
  const [uniqueActors, setUniqueActors] = useState<string[]>([]);
  const [uniqueActions, setUniqueActions] = useState<string[]>([]);

  const loadLogs = async () => {
    setLoading(true);
    const health = await api.health();
    if (!health.success) {
      setBackendOnline(false);
      setLoading(false);
      return;
    }

    const filters: { action?: string; actorEmail?: string; search?: string } = {};
    if (selectedAction) filters.action = selectedAction;
    if (selectedActor) filters.actorEmail = selectedActor;
    if (search) filters.search = search;

    const res = await api.getAuditLogs(filters);

    if (res.success && res.data) {
      setLogs(res.data);
      setBackendOnline(true);
    } else {
      setLogs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadLogs();
  }, [selectedAction, selectedActor]);

  // Handle live client-side filters for derive unique actions & actors lists on initial loads
  useEffect(() => {
    if (logs.length > 0 && uniqueActors.length === 0) {
      const actors = Array.from(new Set(logs.map((l) => l.actorEmail)));
      const actions = Array.from(new Set(logs.map((l) => l.action)));
      setUniqueActors(actors);
      setUniqueActions(actions);
    }
  }, [logs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void loadLogs();
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedAction("");
    setSelectedActor("");
    // Re-trigger load by changing properties or issuing fresh request
    setTimeout(() => {
      void loadLogs();
    }, 50);
  };

  // Derive simple statistics
  const totalAuditsCount = logs.length;
  const issuanceCount = logs.filter((l) => l.action === "certificate_issued").length;
  const modificationCount = logs.filter((l) => l.action.includes("updated") || l.action.includes("created")).length;
  const securityCount = logs.filter((l) => l.action === "rest_api_toggled" || l.action === "certificate_revoked").length;

  return (
    <Sidebar>
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={pageVariants}
        className="space-y-6 max-w-6xl mx-auto pb-10"
      >
        {/* Decorative dynamic glows */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-100/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-100/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header section */}
        <motion.div variants={headerSlide} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] flex items-center gap-2">
              <svg className="w-7 h-7 text-[var(--color-primary)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
              </svg>
              Dean's Compliance Ledger
            </h1>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Isolated academic audit trail tracking system executions, certificate issuances, and administrator modifications.
            </p>
          </div>
          <button
            onClick={() => void loadLogs()}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition-all cursor-pointer flex items-center gap-2 shadow-sm text-gray-700 active:scale-95"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[var(--color-primary)]" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh Ledger
          </button>
        </motion.div>

        {/* Server status alert */}
        {!backendOnline && (
          <motion.div variants={fadeUp} className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
            <span>Could not connect to the backend API services. Please verify that Docker service containers are active.</span>
          </motion.div>
        )}

        {/* Glassmorphic KPI Grid */}
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div variants={fadeUp} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-muted)]">Total Audits</div>
            <div className="text-2xl font-bold text-[var(--color-foreground)] mt-2">{totalAuditsCount}</div>
            <div className="text-[9px] text-[var(--color-muted)] mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Complete ledger depth
            </div>
          </motion.div>
          
          <motion.div variants={fadeUp} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-muted)]">Issuances</div>
            <div className="text-2xl font-bold text-emerald-600 mt-2">{issuanceCount}</div>
            <div className="text-[9px] text-[var(--color-muted)] mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Recipient credential events
            </div>
          </motion.div>
          
          <motion.div variants={fadeUp} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-muted)]">Layout Modifications</div>
            <div className="text-2xl font-bold text-amber-500 mt-2">{modificationCount}</div>
            <div className="text-[9px] text-[var(--color-muted)] mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Templates & event changes
            </div>
          </motion.div>
          
          <motion.div variants={fadeUp} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-muted)]">Security Operations</div>
            <div className="text-2xl font-bold text-red-500 mt-2">{securityCount}</div>
            <div className="text-[9px] text-[var(--color-muted)] mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              REST API toggles / Revocations
            </div>
          </motion.div>
        </motion.div>

        {/* Filters and search panel */}
        <motion.div variants={fadeUp} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-foreground)]">Ledger Search & Filters</h3>
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search audit descriptions (e.g. issued, deleted)..."
                className="w-full text-xs border border-[var(--color-border)] rounded-xl pl-9 pr-4 py-2.5 bg-[var(--color-background)] focus:outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--color-muted)]/55 text-[var(--color-foreground)]"
              />
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>

            {/* Action Select Filter */}
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="text-xs border border-[var(--color-border)] rounded-xl px-3 py-2.5 bg-[var(--color-background)] focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-foreground)]"
            >
              <option value="">All Audited Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {getActionLabel(action)}
                </option>
              ))}
            </select>

            {/* Actor Select Filter */}
            <select
              value={selectedActor}
              onChange={(e) => setSelectedActor(e.target.value)}
              className="text-xs border border-[var(--color-border)] rounded-xl px-3 py-2.5 bg-[var(--color-background)] focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-foreground)] text-ellipsis overflow-hidden"
            >
              <option value="">All Administrators</option>
              {uniqueActors.map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          </form>

          {/* Search trigger & clear hooks */}
          <div className="flex gap-2 justify-end">
            {(search || selectedAction || selectedActor) && (
              <button
                onClick={handleResetFilters}
                className="px-3.5 py-1.5 rounded-lg text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer active:scale-95 transition-all"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={() => void loadLogs()}
              className="px-4 py-1.5 rounded-lg text-[10px] font-bold bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white shadow-sm cursor-pointer active:scale-95 transition-all"
            >
              Apply Filter Query
            </button>
          </div>
        </motion.div>

        {/* Ledger Event Timeline Stream */}
        <motion.div variants={fadeUp} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-foreground)]">Compliance History Ledger</h3>
            <span className="text-[10px] font-mono text-[var(--color-muted)]">Time-Series Audit Trail</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] text-[9px] uppercase font-bold tracking-wider text-[var(--color-muted)]">
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Administrator</th>
                  <th className="px-6 py-3">Action Type</th>
                  <th className="px-6 py-3">Audit Details</th>
                  <th className="px-6 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-3 w-16 bg-gray-200/70 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-32 bg-gray-200/70 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-5 w-24 bg-gray-200/70 rounded-full" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-64 bg-gray-200/70 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-8 bg-gray-200/70 rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-xs text-[var(--color-muted)]">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-2 text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                      </div>
                      No compliance audit entries match the current filters.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setActiveLog(log)}
                      className="hover:bg-[var(--color-surface-alt)]/25 transition-all text-xs text-[var(--color-foreground)] cursor-pointer group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-[10px] text-[var(--color-muted)]">
                        {formatRelativeTime(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold">{log.actorName}</div>
                        <div className="text-[10px] text-[var(--color-muted)]">{log.actorEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-wide ${getActionBadgeStyle(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-sm truncate font-medium text-gray-700">
                        {log.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button className="text-[10px] font-bold text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          View details →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>

      {/* Dynamic Detail Disclosure Drawer Drawer modal overlay */}
      <AnimatePresence>
        {activeLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveLog(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-foreground)] flex items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold font-mono ${getActionBadgeStyle(activeLog.action)}`}>
                      {getActionLabel(activeLog.action)}
                    </span>
                    Compliance Audit Detail
                  </h3>
                  <span className="text-[9px] text-[var(--color-muted)] font-mono">{activeLog.id}</span>
                </div>
                <button
                  onClick={() => setActiveLog(null)}
                  className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-all active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Log context info */}
              <div className="space-y-3 p-4 bg-[var(--color-background)] rounded-xl border border-[var(--color-border)] text-xs">
                <div className="leading-relaxed font-semibold text-gray-800">
                  {activeLog.description}
                </div>
                <div className="border-t border-dashed border-[var(--color-border)] pt-2.5 grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider font-bold text-[var(--color-muted)] mb-0.5">Admin Operator</span>
                    <strong className="text-gray-700">{activeLog.actorName}</strong>
                    <span className="block text-[10px] text-[var(--color-muted)]">{activeLog.actorEmail}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider font-bold text-[var(--color-muted)] mb-0.5">Precise Date & Time</span>
                    <strong className="text-gray-700 font-mono text-[10px]">{new Date(activeLog.createdAt).toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Client session context (IP & UA) */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Operator Client Context</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="p-3 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl">
                    <span className="block text-[8px] uppercase tracking-wider font-bold text-[var(--color-muted)] mb-1">IP Address</span>
                    <span className="font-mono text-[10px] font-semibold text-[var(--color-foreground)]">{activeLog.ipAddress || "127.0.0.1"}</span>
                  </div>
                  <div className="p-3 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl md:col-span-2">
                    <span className="block text-[8px] uppercase tracking-wider font-bold text-[var(--color-muted)] mb-1">User Agent Stream</span>
                    <span className="font-mono text-[9px] text-[var(--color-muted)] leading-normal break-all block max-h-12 overflow-y-auto">
                      {activeLog.userAgent || "Mozilla/5.0 System Fallback Browser API"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setActiveLog(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer active:scale-95 transition-all"
                >
                  Dismiss Details
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Sidebar>
  );
}
