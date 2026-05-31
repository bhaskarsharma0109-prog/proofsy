"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface RevocationModalProps {
  open: boolean;
  title?: string;
  description?: string;
  recipientPreview?: string;
  count?: number;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export default function RevocationModal({
  open,
  title = "Revoke Certificate",
  description = "Revoked credentials will fail public verification immediately.",
  recipientPreview,
  count,
  loading = false,
  onCancel,
  onConfirm,
}: RevocationModalProps) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md bg-white border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-bold text-[var(--color-foreground)]">{title}</h2>
          <p className="text-xs text-[var(--color-muted)] mt-1 leading-relaxed">{description}</p>
        </div>

        <div className="p-6 space-y-4">
          {(recipientPreview || count) && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-700">
              {count && count > 1 ? `${count} selected certificates will be revoked.` : recipientPreview}
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">
              Revocation Reason
            </label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              placeholder="Example: Issued in error, duplicate credential, policy violation..."
              className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--color-surface-alt)] text-[var(--color-foreground)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim() || "Revoked by organization")}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white disabled:opacity-50"
          >
            {loading ? "Revoking..." : "Confirm Revoke"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
