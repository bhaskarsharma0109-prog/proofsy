"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api, RecipientPortalData, BACKEND_URL } from "@/lib/api";
import { clearRecipientEmail, loadRecipientEmail } from "@/lib/recipient-auth";

export default function RecipientDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<RecipientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPortal() {
      const email = loadRecipientEmail();

      if (!email) {
        router.push("/recipient/login");
        return;
      }

      const res = await api.getUserCertificates(email);

      if (!res.success || !res.data) {
        setError(res.error || "Unable to load your recipient dashboard.");
        setLoading(false);
        return;
      }

      setData(res.data);
      setLoading(false);
    }

    loadPortal();
  }, [router]);

  const handleLogout = () => {
    clearRecipientEmail();
    router.push("/recipient/login");
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center text-sm text-[var(--color-muted)]">Loading recipient dashboard...</div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-[var(--color-foreground)]">Portal unavailable</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{error || "We could not load your profile."}</p>
          <Link href="/recipient/login" className="inline-flex mt-5 bg-[var(--color-primary)] text-white px-4 py-2 rounded-xl text-sm font-semibold">
            Return to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
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
          <button onClick={handleLogout} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-white rounded-3xl border border-[var(--color-border)] p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-primary)]">Recipient Summary</p>
          <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-foreground)]">{data.user.name}</h1>
              <p className="text-sm text-[var(--color-muted)] mt-2">{data.user.email}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--color-surface-alt)] rounded-2xl p-4 min-w-[160px]">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Events</p>
                <p className="mt-2 text-2xl font-bold text-[var(--color-foreground)]">{data.totalEventsAttended}</p>
              </div>
              <div className="bg-[var(--color-surface-alt)] rounded-2xl p-4 min-w-[160px]">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Certificates</p>
                <p className="mt-2 text-2xl font-bold text-[var(--color-foreground)]">{data.certificates.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--color-border)]">
            <h2 className="text-lg font-bold text-[var(--color-foreground)]">My Certificates</h2>
            <p className="text-sm text-[var(--color-muted)] mt-1">All credentials issued to your recipient email.</p>
          </div>

          {data.certificates.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-base font-semibold text-[var(--color-foreground)]">No certificates yet</p>
              <p className="text-sm text-[var(--color-muted)] mt-2">Once an organizer issues a credential to your email, it will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {data.certificates.map((certificate) => (
                <article key={certificate.id} className="px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-[var(--color-foreground)]">{certificate.eventName}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--color-muted)]">
                      <span>{formatDate(certificate.eventDate)}</span>
                      <span className="font-mono text-[var(--color-primary)]">{certificate.verificationCode}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/verify?code=${encodeURIComponent(certificate.verificationCode)}`} className="border border-[var(--color-border)] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--color-surface-alt)]">
                      Verify
                    </Link>
                    {certificate.pdfUrl ? (
                      <a href={`${BACKEND_URL}${certificate.pdfUrl}`} target="_blank" rel="noopener noreferrer" className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)]">
                        Download PDF
                      </a>
                    ) : (
                      <span className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-surface-alt)] text-[var(--color-muted)]">PDF pending</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
