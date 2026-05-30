"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RecipientAuthLayout from "@/components/RecipientAuthLayout";
import { api } from "@/lib/api";
import { saveRecipientEmail } from "@/lib/recipient-auth";

export default function RecipientSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const res = await api.createUser({
      name: name.trim(),
      email: normalizedEmail,
    });

    if (!res.success || !res.data) {
      setError(res.error || "We could not create your recipient profile.");
      setSubmitting(false);
      return;
    }

    saveRecipientEmail(normalizedEmail);
    setSubmitting(false);
    router.push("/recipient/dashboard");
  };

  return (
    <RecipientAuthLayout
      title="Create your recipient profile"
      description="Set up your email-based certificate access so future credentials show up in one dashboard."
      footer={
        <>
          Already have a recipient account?{" "}
          <Link href="/recipient/login" className="font-medium text-[var(--color-primary)] hover:underline">
            Sign in
          </Link>
          .
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-foreground)]">Full Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            type="text"
            placeholder="Alex Morgan"
            className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
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
          disabled={submitting || !name.trim() || !email.trim()}
          className="w-full bg-[var(--color-primary)] text-white font-semibold py-3 rounded-xl hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Create Account"}
        </button>
      </form>
    </RecipientAuthLayout>
  );
}
