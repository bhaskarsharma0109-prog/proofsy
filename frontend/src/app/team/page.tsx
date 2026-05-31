"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";
import { pageVariants, staggerContainer, fadeUp, headerSlide, cardHover, cardTap, pulseGlow } from "@/lib/animations";
import { useAuth } from "@/contexts/AuthContext";

export default function TeamPage() {
  const { member } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");

  // Invite Form State
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState("editor"); // default: Student Lead (editor)
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const storedWorkspaceId = localStorage.getItem("proofsy_workspace_id");
    setWorkspaceId(storedWorkspaceId);

    async function loadWorkspaceDetails() {
      if (!storedWorkspaceId) return;
      
      // Load workspaces to find this one's name
      const wRes = await api.listWorkspaces();
      if (wRes.success && wRes.data) {
        const current = wRes.data.find((w: any) => w._id === storedWorkspaceId);
        if (current) setWorkspaceName(current.name);
      }

      // Load members
      const mRes = await api.listWorkspaceMembers(storedWorkspaceId);
      if (mRes.success && mRes.data) {
        setMembers(mRes.data);
      }
      setLoading(false);
    }

    loadWorkspaceDetails();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !inviteName || !inviteEmail || !invitePassword || !inviteRole) return;

    setInviting(true);
    setInviteSuccess("");
    setInviteError("");

    const res = await api.inviteWorkspaceMember(workspaceId, {
      name: inviteName,
      email: inviteEmail,
      password: invitePassword,
      role: inviteRole,
    });

    setInviting(false);

    if (res.success) {
      setInviteSuccess(`Successfully invited ${inviteName} as a workspace team member.`);
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("");
      setInviteRole("editor");
      
      // Reload member list
      const mRes = await api.listWorkspaceMembers(workspaceId);
      if (mRes.success && mRes.data) {
        setMembers(mRes.data);
      }
    } else {
      setInviteError(res.error || "Failed to invite member");
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return "College Dean / Owner";
      case "admin":
        return "HOD / Faculty Advisor";
      case "editor":
        return "Student Coordinator";
      case "viewer":
        return "Volunteer / Viewer";
      default:
        return role;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200/50";
      case "admin":
        return "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-200/50";
      case "editor":
        return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/50";
      default:
        return "bg-gray-50 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200/50";
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-20 right-12 w-60 h-60 bg-emerald-200/15 rounded-full blur-3xl pointer-events-none" />
        <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: "1.2s" }} className="absolute bottom-28 left-20 w-52 h-52 bg-indigo-200/10 rounded-full blur-3xl pointer-events-none" />

        <motion.header variants={headerSlide} initial="hidden" animate="visible" className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5">
          <h2 className="text-xl font-bold text-[var(--color-foreground)]">Workspace Coordinators</h2>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Manage permissions, assign student leads, and invite volunteers to the <strong>{workspaceName || "active"}</strong> department/club workspace.</p>
        </motion.header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 relative z-[1] grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Member List */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-sm text-[var(--color-foreground)] mb-4">Coordinators & Staff</h3>
              {loading ? (
                <div className="text-center py-10 text-[var(--color-muted)] text-sm">
                  Loading team members...
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-10 text-[var(--color-muted)] text-sm">
                  No other members in this workspace yet. Use the invitation panel to add coordinators.
                </div>
              ) : (
                <motion.div variants={staggerContainer} className="divide-y divide-[var(--color-border)]">
                  {members.map((m) => (
                    <motion.div
                      key={m._id}
                      variants={fadeUp}
                      className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center font-bold text-sm text-[var(--color-foreground)]">
                          {m.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-[var(--color-foreground)]">{m.name}</div>
                          <div className="text-xs text-[var(--color-muted)]">{m.email}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded border ${getRoleBadgeClass(m.role)}`}>
                        {getRoleLabel(m.role)}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          {/* Invitation Panel */}
          <div className="lg:col-span-5">
            {(member?.role === "owner" || member?.role === "admin") ? (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-[var(--color-foreground)]">Invite Coordinator / Volunteer</h3>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">Add faculty advisors or student coordinators to this workspace.</p>
                </div>

                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Rajesh Kumar"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-foreground)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">Official Email Address</label>
                    <input
                      type="email"
                      placeholder="rajesh.kumar@college.edu.in"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-foreground)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">Temporary Password</label>
                    <input
                      type="password"
                      placeholder="At least 6 characters"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-foreground)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">Workspace Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-foreground)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                    >
                      <option value="admin">HOD / Faculty Advisor (Full Settings Access)</option>
                      <option value="editor">Student Coordinator (Create Events & Issue Certificates)</option>
                      <option value="viewer">Volunteer / Viewer (Read-only status monitoring)</option>
                    </select>
                  </div>

                  {inviteSuccess && (
                    <div className="text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 rounded-lg border border-emerald-200/50">{inviteSuccess}</div>
                  )}
                  {inviteError && (
                    <div className="text-xs text-red-500 font-semibold bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg border border-red-200/50">{inviteError}</div>
                  )}

                  <motion.button
                    whileTap={cardTap}
                    type="submit"
                    disabled={inviting || !inviteName || !inviteEmail || !invitePassword}
                    className="w-full bg-[var(--color-primary)] text-white py-2.5 rounded-xl hover:bg-[var(--color-primary-dark)] font-semibold text-sm shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {inviting ? "Inviting..." : "Send Invitation"}
                  </motion.button>
                </form>
              </div>
            ) : (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 text-center text-[var(--color-muted)] text-sm shadow-sm">
                Only College Owners or HODs can invite team members to this workspace.
              </div>
            )}
          </div>

        </motion.div>
      </main>
    </div>
  );
}
