"use client";

import Link from "next/link";
import Image from "next/image";

export default function RecipientAuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
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
              <p className="text-[11px] text-[var(--color-muted)] mt-1">Recipient Portal</p>
            </div>
          </Link>
          <Link href="/verify" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
            Verify certificate
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
          <section className="hidden lg:block bg-white rounded-[28px] border border-[var(--color-border)] p-10 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-primary)]">Certificate Access</p>
            <h1 className="mt-4 text-4xl font-bold text-[var(--color-foreground)] leading-tight">
              Keep every issued credential in one place.
            </h1>
            <p className="mt-4 text-base text-[var(--color-muted)] leading-relaxed">
              Recipients can sign in with their issued email to review credentials, download PDFs, and keep a clean history of completed events.
            </p>
            <div className="mt-8 grid gap-4">
              {[
                "View every certificate tied to your email identity",
                "Open verification-ready PDFs in one click",
                "Track all events completed under a single profile",
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

          <section className="bg-white rounded-[28px] border border-[var(--color-border)] p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-primary)]">Recipient Access</p>
            <h2 className="mt-3 text-3xl font-bold text-[var(--color-foreground)]">{title}</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{description}</p>
            <div className="mt-8">{children}</div>
            <div className="mt-6 text-sm text-[var(--color-muted)]">{footer}</div>
          </section>
        </div>
      </main>
    </div>
  );
}
