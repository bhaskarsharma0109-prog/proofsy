"use client";

import { BrandingData, CertificateStatus } from "@/lib/api";

type CertificateSummary = {
  recipientName: string;
  eventName: string;
  organizerName?: string;
  issuedAt: string;
  expiresAt?: string | null;
  status?: CertificateStatus;
};

interface BrandedVerificationCardProps {
  certificate: CertificateSummary;
  branding?: BrandingData | null;
  isValid: boolean;
  reason?: string | null;
}

const statusLabels: Record<CertificateStatus, string> = {
  pending: "Pending",
  generated: "Generated",
  failed: "Failed",
  revoked: "Revoked",
  expired: "Expired",
  suspended: "Suspended",
};

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BrandedVerificationCard({
  certificate,
  branding,
  isValid,
  reason,
}: BrandedVerificationCardProps) {
  const brandEnabled = Boolean(branding?.brandingEnabled);
  const primary = brandEnabled ? branding?.primaryColor || "#2563EB" : "#2563EB";
  const accent = brandEnabled ? branding?.accentColor || "#16A34A" : isValid ? "#16A34A" : "#DC2626";
  const title = brandEnabled && branding?.verificationPageTitle
    ? branding.verificationPageTitle
    : isValid
      ? "Certificate Verified"
      : "Certificate Not Valid";
  const status = certificate.status ? statusLabels[certificate.status] : isValid ? "Generated" : "Invalid";

  return (
    <section
      className="rounded-xl border bg-white overflow-hidden shadow-sm"
      style={{ borderColor: isValid ? accent : "#DC2626" }}
    >
      <div className="px-5 py-4 flex items-center gap-3" style={{ backgroundColor: `${primary}12` }}>
        {brandEnabled && branding?.logo ? (
          <img
            src={branding.logo}
            alt={branding.workspaceName || "Issuer logo"}
            className="w-10 h-10 rounded-lg object-contain bg-white border border-white/70"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: primary }}>
            {isValid ? "OK" : "!"}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-bold" style={{ color: isValid ? primary : "#DC2626" }}>
            {title}
          </h2>
          <p className="text-[10px] text-[var(--color-muted)] truncate">
            {brandEnabled ? branding?.workspaceName : "Proofsy"} verification result
          </p>
        </div>
        <span
          className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
          style={{
            color: isValid ? accent : "#DC2626",
            backgroundColor: isValid ? `${accent}14` : "#FEF2F2",
          }}
        >
          {status}
        </span>
      </div>

      {!isValid && reason && (
        <div className="mx-5 mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {reason}
        </div>
      )}

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-0.5">Recipient</p>
          <p className="text-xs font-semibold text-[var(--color-foreground)]">{certificate.recipientName}</p>
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-0.5">Issued By</p>
          <p className="text-xs font-semibold text-[var(--color-foreground)]">{certificate.organizerName || branding?.workspaceName || "Proofsy"}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-0.5">Credential</p>
          <p className="text-xs font-semibold text-[var(--color-foreground)]">{certificate.eventName}</p>
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-0.5">Issued</p>
          <p className="text-xs font-mono text-[var(--color-foreground)]">{formatDate(certificate.issuedAt)}</p>
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-0.5">Expires</p>
          <p className="text-xs font-mono text-[var(--color-foreground)]">{formatDate(certificate.expiresAt)}</p>
        </div>
      </div>
    </section>
  );
}
