"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import RecipientAuthLayout from "@/components/RecipientAuthLayout";
import { api } from "@/lib/api";
import { saveRecipientEmail, saveRecipientToken } from "@/lib/recipient-auth";
import { cardTap } from "@/lib/animations";

export default function RecipientLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRequestOTP = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const res = await api.requestRecipientOTP(normalizedEmail);

    if (!res.success) {
      setError(res.error || "We could not find a recipient account for that email.");
      setSubmitting(false);
      return;
    }

    if (res.debugOtp) {
      console.log("[Proofsy Debug] OTP received:", res.debugOtp);
      setOtp(res.debugOtp);
    }

    setStep("otp");
    setSubmitting(false);
  };

  const handleVerifyOTP = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const res = await api.verifyRecipientOTP(normalizedEmail, otp.trim());

    if (!res.success) {
      setError(res.error || "Invalid OTP.");
      setSubmitting(false);
      return;
    }

    saveRecipientEmail(normalizedEmail);
    if (res.token) {
      saveRecipientToken(res.token);
    }
    setSubmitting(false);
    router.push("/recipient/dashboard");
  };

  return (
    <RecipientAuthLayout
      title={step === "email" ? "Sign in to your certificate portal" : "Enter Verification Code"}
      description={step === "email" ? "Use the same email address your certificates were issued to." : `We sent a 6-digit code to ${email}`}
      footer={
        step === "email" ? (
          <>
            Need a recipient profile first?{" "}
            <Link href="/recipient/signup" className="font-medium text-[var(--color-primary)] hover:underline">
              Create one here
            </Link>
            .
          </>
        ) : (
          <button type="button" onClick={() => setStep("email")} className="font-medium text-[var(--color-primary)] hover:underline">
            Use a different email address
          </button>
        )
      }
    >
      {step === "email" ? (
        <form onSubmit={handleRequestOTP} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-foreground)]">Email Address</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="you@example.com"
              className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
          <motion.button
            type="submit"
            disabled={submitting || !email.trim()}
            whileTap={cardTap}
            className="w-full bg-[var(--color-primary)] text-white font-semibold py-3 rounded-xl hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
          >
            {submitting ? "Sending code..." : "Continue with Email"}
          </motion.button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-foreground)]">6-Digit Code</label>
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              type="text"
              placeholder="123456"
              maxLength={6}
              className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)] tracking-[0.5em] text-center font-mono text-lg"
            />
          </div>
          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
          <motion.button
            type="submit"
            disabled={submitting || otp.trim().length < 6}
            whileTap={cardTap}
            className="w-full bg-[var(--color-primary)] text-white font-semibold py-3 rounded-xl hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
          >
            {submitting ? "Verifying..." : "Sign In"}
          </motion.button>
        </form>
      )}
    </RecipientAuthLayout>
  );
}
