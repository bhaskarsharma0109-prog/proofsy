"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { pageVariants, fadeUp, cardTap } from "@/lib/animations";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        orgName: formData.organizationName,
      });
      if (res.success && res.data) {
        if (res.token) {
          localStorage.setItem("proofsy_admin_token", res.token);
        }
        login(res.data);
        router.push("/");
      } else {
        setError(res.error || "Registration failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await api.demoLogin();
      if (res.success && res.data) {
        if (res.token) {
          localStorage.setItem("proofsy_admin_token", res.token);
        }
        login(res.data);
        router.push("/");
      } else {
        setError(res.error || "Failed to create demo workspace");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      <header className="border-b border-[var(--color-border)] bg-white/90 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center">
              <Image src="/logo.svg" alt="Proofsy" width={36} height={36} className="object-contain" />
            </div>
            <div>
              <p className="text-base font-bold text-[var(--color-foreground)] leading-none">Proofsy</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-1">Organization Portal</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/recipient/login" className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-all">
              Recipient Login
            </Link>
            <div className="h-4 w-px bg-[var(--color-border)]"></div>
            <Link href="/verify" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
              Verify Certificate
            </Link>
          </div>
        </div>
      </header>

      <motion.main variants={pageVariants} initial="hidden" animate="visible" className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
          <section className="hidden lg:block bg-white rounded-[28px] border border-[var(--color-border)] p-10 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-primary)]">Get Started</p>
            <h1 className="mt-4 text-4xl font-bold text-[var(--color-foreground)] leading-tight">
              Create your organization in seconds.
            </h1>
            <p className="mt-4 text-base text-[var(--color-muted)] leading-relaxed">
              Start issuing verifiable certificates to your students, employees, or attendees immediately.
            </p>
            <div className="mt-8 grid gap-4">
              {[
                "Bulk issue via CSV uploads instantly",
                "Access premium certificate templates",
                "Verify authenticity with a single scan",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] p-4">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-primary-faint)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  </div>
                  <p className="text-sm text-[var(--color-foreground)]">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <motion.section variants={fadeUp} className="bg-white rounded-[28px] border border-[var(--color-border)] p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-primary)]">Admin Registration</p>
            <h2 className="mt-3 text-3xl font-bold text-[var(--color-foreground)]">Create an account</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Fill out the details below to register your organization.</p>
            
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-foreground)]">Your Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-foreground)]">Organization Name</label>
                <input
                  name="organizationName"
                  type="text"
                  required
                  value={formData.organizationName}
                  onChange={handleChange}
                  placeholder="Acme Corp"
                  className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-foreground)]">Email Address</label>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-foreground)]">Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
              
              <motion.button
                type="submit"
                disabled={loading || !formData.email || !formData.password || !formData.name || !formData.organizationName}
                whileTap={cardTap}
                className="w-full bg-[var(--color-primary)] text-white font-semibold py-3 rounded-xl hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Organization"}
              </motion.button>
            </form>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-[var(--color-border)]"></div>
              <span className="flex-shrink mx-4 text-[var(--color-muted)] text-[12px] uppercase tracking-wider font-semibold">or</span>
              <div className="flex-grow border-t border-[var(--color-border)]"></div>
            </div>

            <motion.button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              whileTap={cardTap}
              className="w-full bg-[var(--color-surface-alt)] text-[var(--color-primary)] border border-[var(--color-primary)] font-semibold py-3 rounded-xl hover:bg-[var(--color-primary-faint)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              Explore Demo Workspace (One-Click)
            </motion.button>
            
            <div className="mt-6 text-sm text-[var(--color-muted)] text-center">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-[var(--color-primary)] hover:underline">
                Sign in here
              </Link>
              .
            </div>

            <div className="mt-6 pt-5 border-t border-[var(--color-border)]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-3 text-center">
                Access Portals
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/recipient/login"
                  className="flex items-center justify-center gap-1.5 border border-[var(--color-border)] rounded-xl px-3 py-3 text-xs font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-surface-alt)] hover:border-[var(--color-border-strong)] transition-all text-center cursor-pointer"
                >
                  <svg className="w-4 h-4 text-[var(--color-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a5 5 0 0 0-5 5h10a5 5 0 0 0-5-5Z" />
                    <circle cx="12" cy="9" r="3" />
                  </svg>
                  Recipient Portal
                </Link>
                <Link
                  href="/verify"
                  className="flex items-center justify-center gap-1.5 border border-[var(--color-border)] rounded-xl px-3 py-3 text-xs font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-surface-alt)] hover:border-[var(--color-border-strong)] transition-all text-center cursor-pointer"
                >
                  <svg className="w-4 h-4 text-[var(--color-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                  Verify Certificate
                </Link>
              </div>
            </div>
          </motion.section>
        </div>
      </motion.main>
    </div>
  );
}
