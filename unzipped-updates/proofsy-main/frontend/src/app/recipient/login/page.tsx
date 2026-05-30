"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RecipientAuthLayout from "@/components/RecipientAuthLayout";
import { api } from "@/lib/api";
import { saveRecipientEmail } from "@/lib/recipient-auth";

export default function RecipientLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const res = await api.getUserCertificates(normalizedEmail);

    if (!res.success || !res.data) {
      setError(res.error || "We could not find a recipient account for that email.");
      setSubmitting(false);
      return;
    }

    saveRecipientEmail(normalizedEmail);
    setSubmitting(false);
    router.push("/recipient/dashboard");
  };

  return (
    <RecipientAuthLayout
      title="Sign in to your certificate portal"
      description="Use the same email address your certificates were issued to."
      footer={
        <>
          Need a recipient profile first?{" "}
          <Link href="/recipient/signup" className="font-medium text-[var(--color-primary)] hover:underline">
            Create one here
          </Link>
          .
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="w-full bg-[var(--color-primary)] text-white font-semibold py-3 rounded-xl hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </RecipientAuthLayout>
  );
}
