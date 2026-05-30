"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, CertificateDetailData, BACKEND_URL } from "@/lib/api";

export default function CertificatePreview() {
  const params = useParams();
  const nameRef = useRef<HTMLHeadingElement>(null);
  const [certificate, setCertificate] = useState<CertificateDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCertificate() {
      const certificateId = Array.isArray(params.id) ? params.id[0] : params.id;

      if (!certificateId) {
        setError("Missing certificate id.");
        setLoading(false);
        return;
      }

      const res = await api.getCertificate(certificateId);

      if (!res.success || !res.data) {
        setError(res.error || "Unable to load certificate.");
        setLoading(false);
        return;
      }

      setCertificate(res.data);
      setLoading(false);
    }

    loadCertificate();
  }, [params.id]);

  useEffect(() => {
    const el = nameRef.current;
    if (!el || !certificate) return;
    el.style.fontSize = "3.5rem";
    const container = el.parentElement;
    if (!container) return;
    let fontSize = 56;
    while (el.scrollWidth > container.clientWidth && fontSize > 18) {
      fontSize -= 1;
      el.style.fontSize = `${fontSize}px`;
    }
  }, [certificate]);

  const formatDate = (value: string | null) => {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)] animate-spin" />
          <p className="mt-4 text-sm text-[var(--color-muted)]">Loading certificate preview...</p>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-[var(--color-border)] rounded-2xl p-8 text-center">
          <h1 className="text-xl font-bold text-[var(--color-foreground)]">Certificate unavailable</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{error || "No certificate data found."}</p>
          <Link
            href="/certificates"
            className="inline-flex mt-5 items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Back to credentials
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Top bar */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
              </svg>
            </div>
            <span className="text-base font-bold text-[var(--color-foreground)]">Proofsy</span>
          </Link>
          <div className="flex items-center gap-3">
            {certificate.pdfUrl ? (
              <a
                href={`${BACKEND_URL}${certificate.pdfUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-[var(--color-surface-alt)] cursor-pointer flex items-center gap-2 text-[var(--color-foreground)]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                Download PDF
              </a>
            ) : (
              <span className="px-4 py-2 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg text-sm font-medium text-[var(--color-muted)]">
                PDF pending
              </span>
            )}
            <Link
              href={`/verify?code=${encodeURIComponent(certificate.verificationCode)}`}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] cursor-pointer flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
              Verify
            </Link>
          </div>
        </div>
      </header>

      {/* Certificate details bar */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-muted)]">Code:</span>
            <span className="font-mono font-semibold text-[var(--color-primary)]">{certificate.verificationCode}</span>
          </div>
          <div className="w-px h-4 bg-[var(--color-border)]" />
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${certificate.status === "generated" ? "bg-[var(--color-success)]" : certificate.status === "failed" ? "bg-[var(--color-error)]" : "bg-[var(--color-warning)]"}`} />
            <span className={`font-medium ${certificate.status === "generated" ? "text-[var(--color-success)]" : certificate.status === "failed" ? "text-[var(--color-error)]" : "text-[var(--color-warning)]"}`}>
              {certificate.status === "generated" ? "Generated" : certificate.status === "failed" ? "Failed" : "Pending"}
            </span>
          </div>
          <div className="w-px h-4 bg-[var(--color-border)]" />
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-muted)]">Issued:</span>
            <span className="font-mono text-[var(--color-foreground)]">{formatDate(certificate.issuedAt)}</span>
          </div>
        </div>
      </div>

      {/* Certificate render */}
      <div className="flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-4xl">
          {/* Shadow wrapper for depth */}
          <div className="bg-[var(--color-surface)] shadow-2xl rounded-sm overflow-hidden">
            {/* The certificate itself */}
            <div className="aspect-[1.414] relative flex flex-col items-center justify-center p-16" style={{
              border: '6px solid var(--color-primary)',
            }}>
              {/* Corner decorations */}
              <div className="absolute top-0 left-0 w-28 h-28 bg-[var(--color-primary)] opacity-[0.06] rounded-br-full" />
              <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--color-primary)] opacity-[0.05] rounded-bl-full" />
              <div className="absolute bottom-0 right-0 w-36 h-36 bg-[var(--color-primary)] opacity-[0.06] rounded-tl-full" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-[var(--color-primary)] opacity-[0.05] rounded-tr-full" />

              {/* Inner border */}
              <div className="absolute inset-4 border border-[var(--color-border)] rounded-sm pointer-events-none" />

              <div className="z-10 text-center w-full max-w-2xl space-y-6">
                {/* Brand */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded bg-[var(--color-primary)] flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--color-primary)] tracking-[0.25em] uppercase">Proofsy</h3>
                  <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-[0.2em]">Certificate of Completion</p>
                </div>

                {/* Certify */}
                <div className="pt-4">
                  <p className="text-sm text-[var(--color-muted)]">This is to certify that</p>
                  <div className="w-full max-w-xl mx-auto mt-3 border-b-2 border-[var(--color-border)] pb-2 overflow-hidden">
                    <h1
                      ref={nameRef}
                      className="font-bold text-[var(--color-foreground)] whitespace-nowrap leading-none tracking-tight"
                      style={{ fontSize: "3.5rem" }}
                    >
                      {certificate.recipientName}
                    </h1>
                  </div>
                </div>

                {/* Event */}
                <div className="space-y-2">
                  <p className="text-sm text-[var(--color-muted)]">has successfully completed the</p>
                  <h2 className="text-2xl font-semibold text-[var(--color-primary)]">{certificate.eventName}</h2>
                </div>

                {/* Footer row */}
                <div className="pt-12 flex justify-between items-end w-full px-8">
                  <div className="text-center">
                    <p className="border-t border-[var(--color-muted)] pt-2 font-medium text-sm text-[var(--color-foreground)]">{formatDate(certificate.eventDate)}</p>
                    <p className="text-[10px] text-[var(--color-muted)] mt-1 uppercase tracking-wider">Date</p>
                  </div>

                  <div className="text-center">
                    <div className="w-20 h-20 border-2 border-[var(--color-primary)] mx-auto mb-2 flex flex-col items-center justify-center bg-[var(--color-primary-faint)] rounded-sm px-2">
                      <span className="font-mono text-[9px] text-[var(--color-primary)]">QR READY</span>
                      <span className="text-[8px] text-[var(--color-muted)] mt-1 text-center leading-tight">PDF scan opens verify page</span>
                    </div>
                    <p className="font-mono text-[10px] text-[var(--color-primary)] font-semibold">{certificate.verificationCode}</p>
                  </div>

                  <div className="text-center">
                    <p className="border-t border-[var(--color-muted)] pt-2 font-medium text-sm text-[var(--color-foreground)]">{certificate.organizerName}</p>
                    <p className="text-[10px] text-[var(--color-muted)] mt-1 uppercase tracking-wider">Organizer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
