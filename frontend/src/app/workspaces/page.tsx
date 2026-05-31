"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";
import { pageVariants, staggerContainer, fadeUp, headerSlide, cardHover, cardTap, pulseGlow } from "@/lib/animations";
import { useAuth } from "@/contexts/AuthContext";

export default function WorkspacesPage() {
  const { member } = useAuth();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Workspace form state
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceSlug, setNewWorkspaceSlug] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  // Selected workspace SMTP state
  const [selectedWorkspace, setSelectedWorkspace] = useState<any | null>(null);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpSuccess, setSmtpSuccess] = useState("");
  const [smtpError, setSmtpError] = useState("");
  const [savingSmtp, setSavingSmtp] = useState(false);

  async function loadWorkspaces() {
    setLoading(true);
    const res = await api.listWorkspaces();
    if (res.success && res.data) {
      setWorkspaces(res.data);
      // Auto-select first workspace if none selected
      if (res.data.length > 0 && !selectedWorkspace) {
        handleSelectWorkspace(res.data[0]);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const handleSelectWorkspace = (w: any) => {
    setSelectedWorkspace(w);
    setSmtpHost(w.smtpSettings?.host || "");
    setSmtpPort(String(w.smtpSettings?.port || "587"));
    setSmtpSecure(w.smtpSettings?.secure === true);
    setSmtpUser(w.smtpSettings?.authUser || "");
    setSmtpPass(w.smtpSettings?.authPass || "");
    setSmtpFromName(w.smtpSettings?.fromName || "");
    setSmtpFromEmail(w.smtpSettings?.fromEmail || "");
    setSmtpSuccess("");
    setSmtpError("");
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName) return;

    setCreating(true);
    setCreateError("");
    const res = await api.createWorkspace(newWorkspaceName, newWorkspaceSlug || undefined);
    setCreating(false);

    if (res.success) {
      setNewWorkspaceName("");
      setNewWorkspaceSlug("");
      await loadWorkspaces();
      if (res.data) {
        handleSelectWorkspace(res.data);
      }
    } else {
      setCreateError(res.error || "Failed to create workspace");
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace) return;

    setSavingSmtp(true);
    setSmtpSuccess("");
    setSmtpError("");

    const res = await api.updateWorkspaceSmtp(selectedWorkspace._id, {
      host: smtpHost,
      port: Number(smtpPort),
      secure: smtpSecure,
      authUser: smtpUser,
      authPass: smtpPass,
      fromName: smtpFromName,
      fromEmail: smtpFromEmail,
    });

    setSavingSmtp(false);

    if (res.success) {
      setSmtpSuccess("Official SMTP settings updated successfully");
      // Update local state list as well
      setWorkspaces((prev) =>
        prev.map((w) =>
          w._id === selectedWorkspace._id
            ? { ...w, smtpSettings: res.data }
            : w
        )
      );
    } else {
      setSmtpError(res.error || "Failed to save SMTP settings");
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-20 right-12 w-60 h-60 bg-indigo-200/15 rounded-full blur-3xl pointer-events-none" />
        <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: "1.2s" }} className="absolute bottom-28 left-20 w-52 h-52 bg-emerald-200/10 rounded-full blur-3xl pointer-events-none" />

        <motion.header variants={headerSlide} initial="hidden" animate="visible" className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5">
          <h2 className="text-xl font-bold text-[var(--color-foreground)]">Departments & Clubs (Workspaces)</h2>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Manage workspaces for fests, student committees, and configure custom SMTP university mail servers.</p>
        </motion.header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 relative z-[1] grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Workspaces List & Form */}
          <div className="lg:col-span-5 space-y-6">
            {/* Create Workspace Card */}
            {member?.role === "owner" && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-sm text-[var(--color-foreground)] mb-4">Add Department / Club</h3>
                <form onSubmit={handleCreateWorkspace} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">Workspace Name</label>
                    <input
                      type="text"
                      placeholder="e.g. CSE Department"
                      value={newWorkspaceName}
                      onChange={(e) => {
                        setNewWorkspaceName(e.target.value);
                        setNewWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""));
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-foreground)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">URL Slug</label>
                    <div className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] overflow-hidden focus-within:border-[var(--color-primary)] transition-colors">
                      <span className="bg-[var(--color-border)] px-3 flex items-center text-xs text-[var(--color-muted)] border-r border-[var(--color-border)] select-none">verify/</span>
                      <input
                        type="text"
                        placeholder="cse-dept"
                        value={newWorkspaceSlug}
                        onChange={(e) => setNewWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        className="flex-1 px-3 py-2.5 bg-transparent text-[var(--color-foreground)] text-sm outline-none"
                      />
                    </div>
                  </div>
                  {createError && (
                    <div className="text-xs text-red-500 font-medium">{createError}</div>
                  )}
                  <motion.button
                    whileTap={cardTap}
                    type="submit"
                    disabled={creating || !newWorkspaceName}
                    className="w-full bg-[var(--color-primary)] text-white py-2.5 rounded-xl hover:bg-[var(--color-primary-dark)] font-semibold text-sm shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {creating ? "Creating..." : "Create Workspace"}
                  </motion.button>
                </form>
              </div>
            )}

            {/* List Card */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm text-[var(--color-foreground)] mb-4">Your Workspaces</h3>
              {loading ? (
                <div className="text-center py-10 text-[var(--color-muted)] text-sm">
                  Loading workspaces...
                </div>
              ) : workspaces.length === 0 ? (
                <div className="text-center py-10 text-[var(--color-muted)] text-sm">
                  No workspaces found.
                </div>
              ) : (
                <motion.div variants={staggerContainer} className="space-y-2">
                  {workspaces.map((w) => (
                    <motion.button
                      key={w._id}
                      variants={fadeUp}
                      whileHover={cardHover}
                      onClick={() => handleSelectWorkspace(w)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all
                        ${selectedWorkspace?._id === w._id
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-faint)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:border-[var(--color-border-strong)]"
                        }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-bold flex items-center justify-center text-[var(--color-foreground)] shrink-0">
                        {w.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 truncate">
                        <div className="font-bold text-xs text-[var(--color-foreground)] truncate">{w.name}</div>
                        <div className="text-[10px] text-[var(--color-muted)] truncate mt-0.5">slug: {w.slug}</div>
                      </div>
                      {w.smtpSettings?.host && (
                        <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-200/50">
                          SMTP Active
                        </span>
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          {/* Workspace Details & Custom SMTP Configuration */}
          <div className="lg:col-span-7">
            {selectedWorkspace ? (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
                  <div>
                    <h3 className="font-bold text-base text-[var(--color-foreground)]">{selectedWorkspace.name} Settings</h3>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">Verification URL Slug: <span className="font-mono bg-[var(--color-surface-alt)] px-1.5 py-0.5 rounded text-[var(--color-primary)] font-semibold">{selectedWorkspace.slug}</span></p>
                  </div>
                </div>

                {/* SMTP Form */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-sm text-[var(--color-foreground)]">Custom SMTP Configuration 📧</h4>
                    <p className="text-xs text-[var(--color-muted)] mt-1">Configure your department or club's official email server. Certificate delivery emails will show your official email in the from-address field (e.g. CSE Fest fest@mit.edu).</p>
                  </div>

                  <form onSubmit={handleSaveSmtp} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">SMTP Host</label>
                        <input
                          type="text"
                          placeholder="e.g. smtp.gmail.com"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-foreground)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">SMTP Port</label>
                        <input
                          type="text"
                          placeholder="587"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-foreground)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        id="smtpSecure"
                        checked={smtpSecure}
                        onChange={(e) => setSmtpSecure(e.target.checked)}
                        className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                      <label htmlFor="smtpSecure" className="text-xs text-[var(--color-foreground)] font-medium select-none">Use SSL/TLS Secure Connection (usually Port 465)</label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">SMTP Username / Email</label>
                        <input
                          type="text"
                          placeholder="e.g. support@college.edu"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-foreground)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">SMTP Password</label>
                        <input
                          type="password"
                          placeholder="••••••••••••••"
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-foreground)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">From Name</label>
                        <input
                          type="text"
                          placeholder="e.g. SNIST CSE Fest"
                          value={smtpFromName}
                          onChange={(e) => setSmtpFromName(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-foreground)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">From Email Address</label>
                        <input
                          type="email"
                          placeholder="e.g. fest@college.edu"
                          value={smtpFromEmail}
                          onChange={(e) => setSmtpFromEmail(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-foreground)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                        />
                      </div>
                    </div>

                    {smtpSuccess && (
                      <div className="text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 rounded-lg border border-emerald-200/50">{smtpSuccess}</div>
                    )}
                    {smtpError && (
                      <div className="text-xs text-red-500 font-semibold bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg border border-red-200/50">{smtpError}</div>
                    )}

                    {(member?.role === "owner" || member?.role === "admin") && (
                      <motion.button
                        whileTap={cardTap}
                        type="submit"
                        disabled={savingSmtp || !smtpHost || !smtpUser || !smtpPass}
                        className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl hover:bg-[var(--color-primary-dark)] font-semibold text-sm shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        {savingSmtp ? "Saving..." : "Save SMTP Settings"}
                      </motion.button>
                    )}
                  </form>
                </div>
              </div>
            ) : (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-12 text-center text-[var(--color-muted)] text-sm shadow-sm">
                Select a department/club workspace to configure settings.
              </div>
            )}
          </div>

        </motion.div>
      </main>
    </div>
  );
}
