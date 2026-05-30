"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { pageVariants, staggerContainer, fadeUp, headerSlide, cardHover, pulseGlow } from "@/lib/animations";

/* ─── Types ────────────────────────────────── */
interface AutomationStep {
  type: "trigger" | "condition" | "action";
  label: string;
  config: string;
}

interface AutomationItem {
  id: string;
  name: string;
  steps: AutomationStep[];
  status: "active" | "draft" | "paused";
  runs: number;
  lastRun: string | null;
  createdAt: string;
}

/* ─── Catalog ──────────────────────────────── */
const TRIGGERS = [
  "CSV uploaded to event",
  "Certificate status becomes failed",
  "New event created",
  "Certificate verified by recipient",
  "New recipient added",
];

const CONDITIONS = [
  "If event has > 10 recipients",
  "If certificate template is 'modern'",
  "If recipient email domain matches",
  "Always (no condition)",
];

const ACTIONS = [
  "Generate credentials",
  "Send delivery email",
  "Notify team in Slack webhook",
  "Create ops follow-up queue",
  "Log to analytics",
  "Send reminder after 7 days",
];

const STATUS_STYLES = {
  active: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  draft: "bg-[var(--color-surface-alt)] text-[var(--color-muted)]",
  paused: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
};

const STEP_COLORS = {
  trigger: "border-blue-300 bg-blue-50 text-blue-700",
  condition: "border-amber-300 bg-amber-50 text-amber-700",
  action: "border-emerald-300 bg-emerald-50 text-emerald-700",
};

const STEP_ICONS = {
  trigger: "⚡",
  condition: "🔀",
  action: "🎯",
};

/* ─── Starter Data ─────────────────────────── */
const starterAutomations: AutomationItem[] = [
  {
    id: "auto-1",
    name: "Issue after workshop upload",
    steps: [
      { type: "trigger", label: "Trigger", config: "CSV uploaded to event" },
      { type: "condition", label: "Condition", config: "Always (no condition)" },
      { type: "action", label: "Action", config: "Generate credentials" },
      { type: "action", label: "Action", config: "Send delivery email" },
    ],
    status: "active",
    runs: 14,
    lastRun: "2026-04-29T10:30:00Z",
    createdAt: "Apr 29, 2026",
  },
  {
    id: "auto-2",
    name: "Flag failed generations",
    steps: [
      { type: "trigger", label: "Trigger", config: "Certificate status becomes failed" },
      { type: "action", label: "Action", config: "Create ops follow-up queue" },
      { type: "action", label: "Action", config: "Notify team in Slack webhook" },
    ],
    status: "draft",
    runs: 0,
    lastRun: null,
    createdAt: "Apr 28, 2026",
  },
  {
    id: "auto-3",
    name: "Verification analytics tracker",
    steps: [
      { type: "trigger", label: "Trigger", config: "Certificate verified by recipient" },
      { type: "condition", label: "Condition", config: "If event has > 10 recipients" },
      { type: "action", label: "Action", config: "Log to analytics" },
    ],
    status: "paused",
    runs: 42,
    lastRun: "2026-04-28T14:20:00Z",
    createdAt: "Apr 27, 2026",
  },
];

export default function AutomationsPage() {
  const [automations, setAutomations] = useState(starterAutomations);
  const [query, setQuery] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Composer state
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<AutomationStep[]>([
    { type: "trigger", label: "Trigger", config: TRIGGERS[0] },
    { type: "action", label: "Action", config: ACTIONS[0] },
  ]);

  const filtered = useMemo(
    () => automations.filter((a) =>
      `${a.name} ${a.steps.map((s) => s.config).join(" ")}`.toLowerCase().includes(query.toLowerCase())
    ),
    [automations, query]
  );

  const addStep = (type: AutomationStep["type"]) => {
    const options = type === "trigger" ? TRIGGERS : type === "condition" ? CONDITIONS : ACTIONS;
    setSteps((s) => [...s, { type, label: type.charAt(0).toUpperCase() + type.slice(1), config: options[0] }]);
  };

  const removeStep = (idx: number) => {
    if (steps.length <= 2) return;
    setSteps((s) => s.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, config: string) => {
    setSteps((s) => s.map((step, i) => i === idx ? { ...step, config } : step));
  };

  const createAutomation = () => {
    if (!name.trim()) return;
    setAutomations((curr) => [{
      id: `auto-${Date.now()}`,
      name: name.trim(),
      steps: [...steps],
      status: "draft",
      runs: 0,
      lastRun: null,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    }, ...curr]);
    setName("");
    setSteps([
      { type: "trigger", label: "Trigger", config: TRIGGERS[0] },
      { type: "action", label: "Action", config: ACTIONS[0] },
    ]);
    setShowComposer(false);
  };

  const cycleStatus = (id: string) => {
    const order: AutomationItem["status"][] = ["draft", "active", "paused"];
    setAutomations((curr) => curr.map((a) => {
      if (a.id !== id) return a;
      const next = order[(order.indexOf(a.status) + 1) % order.length];
      return { ...a, status: next };
    }));
  };

  const deleteAutomation = (id: string) => {
    setAutomations((curr) => curr.filter((a) => a.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const activeCount = automations.filter((a) => a.status === "active").length;
  const totalRuns = automations.reduce((sum, a) => sum + a.runs, 0);

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-16 right-24 w-52 h-52 bg-orange-200/15 rounded-full blur-3xl pointer-events-none" />
        <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: '1s' }} className="absolute bottom-24 left-16 w-64 h-64 bg-blue-200/10 rounded-full blur-3xl pointer-events-none" />

        <motion.header variants={headerSlide} initial="hidden" animate="visible" className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">Automations</h2>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">
              {activeCount} active · {totalRuns} total runs
            </p>
          </div>
          <motion.button
            onClick={() => setShowComposer((c) => !c)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl hover:bg-[var(--color-primary-dark)] font-semibold text-sm shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            {showComposer ? "Close Builder" : "Build Workflow"}
          </motion.button>
        </motion.header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 space-y-6 relative z-[1]">
          {/* Workflow Builder */}
          <AnimatePresence>
            {showComposer && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-2xl border border-[var(--color-border)] p-6 overflow-hidden"
              >
                <h3 className="text-base font-bold text-[var(--color-foreground)] mb-4">Workflow Builder</h3>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Automation name..."
                  className="w-full border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm mb-5 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
                />

                {/* Visual pipeline */}
                <div className="space-y-3 mb-5">
                  {steps.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${STEP_COLORS[step.type]}`}
                    >
                      <span className="text-lg">{STEP_ICONS[step.type]}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider w-16 shrink-0">{step.type}</span>
                      <select
                        value={step.config}
                        onChange={(e) => updateStep(i, e.target.value)}
                        className="flex-1 bg-white/80 border border-current/20 rounded-lg px-3 py-1.5 text-xs focus:outline-none cursor-pointer"
                      >
                        {(step.type === "trigger" ? TRIGGERS : step.type === "condition" ? CONDITIONS : ACTIONS).map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                      {steps.length > 2 && (
                        <button onClick={() => removeStep(i)} className="text-current/50 hover:text-current cursor-pointer">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Add step buttons */}
                <div className="flex gap-2 mb-5">
                  <button onClick={() => addStep("condition")} className="text-xs border border-amber-300 text-amber-600 px-3 py-1.5 rounded-lg hover:bg-amber-50 cursor-pointer">+ Condition</button>
                  <button onClick={() => addStep("action")} className="text-xs border border-emerald-300 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-50 cursor-pointer">+ Action</button>
                </div>

                <div className="flex gap-3">
                  <motion.button whileTap={{ scale: 0.97 }} onClick={createAutomation} disabled={!name.trim()} className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] disabled:opacity-40 cursor-pointer">
                    Create Automation
                  </motion.button>
                  <button onClick={() => setShowComposer(false)} className="border border-[var(--color-border)] px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--color-surface-alt)] cursor-pointer">
                    Cancel
                  </button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Search */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search automations..."
                className="w-full border border-[var(--color-border)] rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <p className="text-sm text-[var(--color-muted)] shrink-0">{filtered.length} workflow{filtered.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Automations list */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center">
              <h3 className="text-lg font-bold text-[var(--color-foreground)]">No automations found</h3>
              <p className="text-sm text-[var(--color-muted)] mt-2">Create a workflow or adjust your search.</p>
              <Link href="/integrations" className="inline-flex mt-5 items-center gap-2 border border-[var(--color-border)] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--color-surface-alt)]">
                Explore integrations
              </Link>
            </div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid gap-4">
              {filtered.map((automation) => (
                <motion.article key={automation.id} variants={fadeUp} whileHover={cardHover} className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
                  {/* Header row */}
                  <div
                    className="p-6 flex items-start justify-between gap-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === automation.id ? null : automation.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-bold text-[var(--color-foreground)]">{automation.name}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[automation.status]}`}>
                          {automation.status.charAt(0).toUpperCase() + automation.status.slice(1)}
                        </span>
                      </div>
                      {/* Mini pipeline preview */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {automation.steps.map((step, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${STEP_COLORS[step.type]}`}>
                              {STEP_ICONS[step.type]} {step.config.split(" ").slice(0, 3).join(" ")}…
                            </span>
                            {i < automation.steps.length - 1 && <span className="text-[var(--color-muted)] text-xs">→</span>}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-xs text-[var(--color-muted)]">{automation.runs} runs</p>
                        <p className="text-xs text-[var(--color-muted)]">
                          {automation.lastRun ? `Last: ${new Date(automation.lastRun).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Never run"}
                        </p>
                        <p className="text-xs text-[var(--color-muted)]">Created {automation.createdAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); cycleStatus(automation.id); }}
                        className="border border-[var(--color-border)] px-4 py-2 rounded-lg text-xs font-medium hover:bg-[var(--color-surface-alt)] cursor-pointer"
                      >
                        {automation.status === "active" ? "Pause" : automation.status === "paused" ? "Set Draft" : "Activate"}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteAutomation(automation.id); }}
                        className="text-[var(--color-error)] hover:bg-[var(--color-error-bg)] p-2 rounded-lg cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                      </button>
                      <svg className={`w-4 h-4 text-[var(--color-muted)] transition-transform ${expandedId === automation.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {expandedId === automation.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-[var(--color-border)] bg-[var(--color-surface-alt)] px-6 py-5 overflow-hidden"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-3">Full Pipeline</p>
                        <div className="space-y-2">
                          {automation.steps.map((step, i) => (
                            <div key={i} className={`flex items-center gap-3 border rounded-xl px-4 py-2.5 ${STEP_COLORS[step.type]}`}>
                              <span className="text-base">{STEP_ICONS[step.type]}</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider w-16 shrink-0">{step.type}</span>
                              <span className="text-xs font-medium">{step.config}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              ))}
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
