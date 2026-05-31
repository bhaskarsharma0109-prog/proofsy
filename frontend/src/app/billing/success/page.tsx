"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { fadeUp, scaleUp, float, pulseGlow } from "@/lib/animations";

function SuccessContent() {
  const searchParams = useSearchParams();
  const txnId = searchParams.get("txnId") || "";
  const isMock = searchParams.get("mock") === "true";
  
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [planName, setPlanName] = useState("");
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!txnId) {
      setStatus("failed");
      return;
    }

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const res = await api.getTransactionStatus(txnId, isMock);
      if (res.success && res.data) {
        if (res.data.status === "paid") {
          setStatus("success");
          setPlanName(res.data.plan);
          setAmount(res.data.amount);
          clearInterval(interval);
        } else if (res.data.status === "failed") {
          setStatus("failed");
          clearInterval(interval);
        }
      }

      if (attempts >= 10) {
        setStatus("failed");
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [txnId, isMock]);

  const getPlanTitle = (id: string) => {
    switch (id) {
      case "annual-pass": return "Unlimited Department Pass";
      case "mega-pass": return "Mega Fest Pass";
      case "fest-pass": return "Single Fest Pass";
      default: return id;
    }
  };

  return (
    <div className="w-full max-w-md bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-2xl overflow-hidden shadow-2xl p-8 relative z-10 text-center">
      {status === "loading" && (
        <div className="space-y-6 py-6">
          <svg className="w-12 h-12 animate-spin mx-auto text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-[var(--color-foreground)]">Verifying Payment Status</h3>
            <p className="text-xs text-[var(--color-muted)] max-w-xs mx-auto">Confirming payment with PhonePe PG. Please do not close or reload this page...</p>
          </div>
        </div>
      )}

      {status === "success" && (
        <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }} className="space-y-6">
          <motion.div variants={float} animate="animate" className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-2">
            <h3 className="font-extrabold text-2xl text-[var(--color-foreground)]">Payment Successful!</h3>
            <p className="text-sm text-[var(--color-muted)]">Your workspace upgrades are now active.</p>
          </motion.div>

          <motion.div variants={scaleUp} className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-4 text-left divide-y divide-[var(--color-border)] text-xs">
            <div className="flex justify-between py-2.5">
              <span className="text-[var(--color-muted)]">Upgrade Plan</span>
              <span className="font-bold text-[var(--color-foreground)]">{getPlanTitle(planName)}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-[var(--color-muted)]">Amount Paid</span>
              <span className="font-mono font-bold text-[var(--color-foreground)]">₹{amount}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-[var(--color-muted)]">Transaction ID</span>
              <span className="font-mono text-[var(--color-muted)] truncate max-w-[150px]">{txnId}</span>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="pt-2">
            <Link href="/" className="block w-full text-center bg-[var(--color-primary)] text-white py-3 rounded-xl hover:bg-[var(--color-primary-dark)] font-semibold text-sm shadow-sm cursor-pointer transition-colors">
              Go to Dashboard
            </Link>
          </motion.div>
        </motion.div>
      )}

      {status === "failed" && (
        <div className="space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </div>

          <div className="space-y-2">
            <h3 className="font-extrabold text-2xl text-[var(--color-foreground)]">Verification Failed</h3>
            <p className="text-sm text-[var(--color-muted)]">We couldn't verify this payment transaction.</p>
          </div>

          <p className="text-xs text-[var(--color-muted)] bg-[var(--color-surface-alt)] p-3 rounded-xl border border-[var(--color-border)]">
            If money was deducted from your account, it will be refunded within 3-5 business days. For urgent queries, contact SNIST Dean/HOD desk.
          </p>

          <div className="pt-2">
            <Link href="/billing" className="block w-full text-center border border-[var(--color-border)] text-[var(--color-foreground)] py-3 rounded-xl hover:bg-[var(--color-surface-alt)] font-semibold text-sm cursor-pointer transition-colors">
              Retry Payment
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <motion.div variants={pulseGlow} animate="animate" className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-200/15 rounded-full blur-3xl pointer-events-none" />
      <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: '1.5s' }} className="absolute bottom-1/4 -right-20 w-72 h-72 bg-emerald-200/10 rounded-full blur-3xl pointer-events-none" />

      <Suspense fallback={
        <div className="w-full max-w-md bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-2xl p-8 text-center space-y-4">
          <svg className="w-12 h-12 animate-spin mx-auto text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-[var(--color-muted)]">Loading redirect content...</p>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
