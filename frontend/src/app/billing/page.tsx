"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";
import { pageVariants, staggerContainer, fadeUp, headerSlide, cardHover, cardTap, pulseGlow } from "@/lib/animations";
import { useAuth } from "@/contexts/AuthContext";

export default function BillingPage() {
  const { member } = useAuth();
  const [workspace, setWorkspace] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasingPlan, setPurchasingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  const pricingPlans = [
    {
      id: "free",
      name: "Free Sandbox",
      price: "₹0",
      description: "Ideal for testing workflows and small local workshops.",
      features: [
        "250 lifetime certificates",
        "Standard verification page",
        "Ethereal test email delivery",
        "Proofsy watermarked branding"
      ],
      cta: "Current Sandbox",
      disabled: true,
      popular: false
    },
    {
      id: "fest-pass",
      name: "Single Fest Pass",
      price: "₹599",
      description: "Perfect for single departmental fests and fests.",
      features: [
        "1,000 certificate credits",
        "Official SMTP university mail server integration",
        "Custom college slug verification link",
        "tamper-proof QR codes",
        "Slack webhook notifications"
      ],
      cta: "Buy Fest Pass",
      disabled: false,
      popular: true
    },
    {
      id: "mega-pass",
      name: "Mega Fest Pass",
      price: "₹1,499",
      description: "Best for large college-wide inter-college fests.",
      features: [
        "3,000 certificate credits",
        "All features of Single Fest Pass",
        "CSV & Google Sheets auto-sync",
        "Dedicated student lead coordinator slots",
        "Multi-workspace team dashboard"
      ],
      cta: "Buy Mega Pass",
      disabled: false,
      popular: false
    },
    {
      id: "annual-pass",
      name: "Unlimited Dept Pass",
      price: "₹3,999",
      period: "/ year",
      description: "For departments hosting fests, fests, workshops year-round.",
      features: [
        "Unlimited certificate issuances",
        "All features included",
        "1 full year subscription active",
        "24/7 dedicated support HOD/dean credentials",
        "No watermark Proofsy branding"
      ],
      cta: "Buy Annual Pass",
      disabled: false,
      popular: false
    }
  ];

  async function loadWorkspaceBilling() {
    setLoading(true);
    const res = await api.listWorkspaces();
    if (res.success && res.data && res.data.length > 0) {
      const activeWorkspaceId = localStorage.getItem("proofsy_workspace_id");
      const current = res.data.find((w: any) => w._id === activeWorkspaceId) || res.data[0];
      setWorkspace(current);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadWorkspaceBilling();
  }, []);

  const handleBuyPlan = async (planId: string) => {
    if (planId === "free") return;
    setPurchasingPlan(planId);
    setError("");

    const res = await api.initiatePayment(planId);
    setPurchasingPlan(null);

    if (res.success && res.data?.redirectUrl) {
      // Redirect to PhonePe payment gateway pay page
      window.location.href = res.data.redirectUrl;
    } else {
      setError(res.error || "Failed to initiate transaction with PhonePe. Please try again.");
    }
  };

  const getActivePlanName = (planId: string) => {
    switch (planId) {
      case "annual-pass": return "Unlimited Department Pass";
      case "mega-pass": return "Mega Fest Pass";
      case "fest-pass": return "Single Fest Pass";
      default: return "Free Sandbox";
    }
  };

  const formatCreditsCount = (credits: number, plan: string) => {
    if (plan === "annual-pass") return "Unlimited";
    return credits.toLocaleString();
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-20 right-12 w-60 h-60 bg-indigo-200/15 rounded-full blur-3xl pointer-events-none" />
        <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: "1.2s" }} className="absolute bottom-28 left-20 w-52 h-52 bg-emerald-200/10 rounded-full blur-3xl pointer-events-none" />

        <motion.header variants={headerSlide} initial="hidden" animate="visible" className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5">
          <h2 className="text-xl font-bold text-[var(--color-foreground)]">Plans & Upgrades</h2>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Top up certificate credits for college fests or secure unlimited departmental subscriptions in INR.</p>
        </motion.header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 relative z-[1] space-y-8 max-w-6xl">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-200/50 font-medium">
              {error}
            </div>
          )}

          {/* Active Usage Card */}
          {workspace && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Active Workspace Context</span>
                <h3 className="font-bold text-lg text-[var(--color-foreground)]">{workspace.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-semibold text-[var(--color-primary)] px-2 py-1 rounded bg-[var(--color-primary-faint)] border border-[var(--color-primary)]/10">
                    {getActivePlanName(workspace.plan)}
                  </span>
                  {workspace.planExpiresAt && (
                    <span className="text-xs text-[var(--color-muted)]">
                      Expires: {new Date(workspace.planExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="w-full md:w-80 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-muted)] font-medium">Remaining Credits</span>
                  <span className="font-bold text-[var(--color-foreground)]">
                    {formatCreditsCount(workspace.credits, workspace.plan)}
                  </span>
                </div>
                {workspace.plan !== "annual-pass" && (
                  <div className="w-full h-2 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (workspace.credits / (workspace.plan === "mega-pass" ? 3000 : workspace.plan === "fest-pass" ? 1000 : 250)) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Grid pricing */}
          <div className="space-y-4">
            <h4 className="font-bold text-base text-[var(--color-foreground)] text-center py-2">Select a pricing model for your department or symposium</h4>
            
            <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {pricingPlans.map((plan) => {
                const isActive = workspace?.plan === plan.id;
                
                return (
                  <motion.div
                    key={plan.id}
                    variants={fadeUp}
                    whileHover={cardHover}
                    className={`bg-[var(--color-surface)] border rounded-2xl p-6 flex flex-col justify-between transition-all relative overflow-hidden shadow-sm
                      ${plan.popular ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/10" : "border-[var(--color-border)]"}
                      ${isActive ? "ring-2 ring-emerald-500/20 border-emerald-500" : ""}
                    `}
                  >
                    {plan.popular && (
                      <span className="absolute top-3 right-3 bg-[var(--color-primary)] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Most Popular
                      </span>
                    )}

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-bold text-sm text-[var(--color-muted)] uppercase tracking-wider">{plan.name}</h4>
                        <div className="flex items-baseline mt-2">
                          <span className="text-3xl font-extrabold text-[var(--color-foreground)]">{plan.price}</span>
                          {plan.period && <span className="text-xs text-[var(--color-muted)] ml-1">{plan.period}</span>}
                        </div>
                        <p className="text-xs text-[var(--color-muted)] mt-2 leading-relaxed">{plan.description}</p>
                      </div>

                      <div className="border-t border-[var(--color-border)] pt-4">
                        <ul className="space-y-2.5">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[var(--color-foreground)]">
                              <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                              <span className="leading-tight">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-8">
                      {isActive ? (
                        <div className="w-full text-center py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-200/50">
                          Active Plan ✓
                        </div>
                      ) : (
                        <motion.button
                          whileTap={cardTap}
                          disabled={plan.disabled || purchasingPlan !== null}
                          onClick={() => handleBuyPlan(plan.id)}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-sm disabled:opacity-50 transition-colors
                            ${plan.popular
                              ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
                              : "bg-[var(--color-surface-alt)] text-[var(--color-foreground)] border border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                            }
                          `}
                        >
                          {purchasingPlan === plan.id ? "Redirecting..." : plan.cta}
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          <div className="bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-4 text-center">
            <p className="text-xs text-[var(--color-muted)]">
              Payments are securely processed by <strong>PhonePe PG</strong>. Transaction ID, checksum, and credentials will be logged for audits.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
