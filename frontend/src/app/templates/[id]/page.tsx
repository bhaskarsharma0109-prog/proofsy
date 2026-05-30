"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import TemplateEditor from "@/components/TemplateEditor";
import { api, TemplateData, TextLayer, QrCodeConfig } from "@/lib/api";
import { pageVariants, fadeUp } from "@/lib/animations";

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await api.getTemplate(templateId);
      if (res.success && res.data) {
        setTemplate(res.data);
      } else {
        setError("Template not found.");
      }
      setLoading(false);
    }
    load();
  }, [templateId]);

  const handleSave = async (layers: TextLayer[], qrCode: QrCodeConfig) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const res = await api.updateTemplate(templateId, {
      textLayers: layers,
      qrCode,
    } as Partial<TemplateData>);

    setSaving(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(res.error || "Failed to save.");
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">
              {template ? `Edit: ${template.name}` : "Edit Template"}
            </h2>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">
              Drag text layers to position them on the certificate background.
            </p>
          </div>
          <button
            onClick={() => router.push("/templates")}
            className="border border-[var(--color-border)] text-[var(--color-foreground)] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--color-surface-alt)] cursor-pointer"
          >
            ← Back to Templates
          </button>
        </header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8">
          {error && (
            <div className="bg-[var(--color-error-bg)] border border-red-200 rounded-xl px-5 py-3 mb-6 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-[var(--color-success-bg)] border border-green-200 rounded-xl px-5 py-3 mb-6 text-sm text-green-700">
              ✓ Template saved successfully!
            </div>
          )}

          {loading ? (
            <motion.div variants={fadeUp} className="text-center py-20">
              <svg className="w-6 h-6 animate-spin mx-auto text-[var(--color-muted)]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              <p className="text-sm text-[var(--color-muted)] mt-3">Loading template...</p>
            </motion.div>
          ) : template ? (
            <TemplateEditor
              backgroundUrl={template.backgroundUrl}
              width={template.width}
              height={template.height}
              initialLayers={template.textLayers}
              initialQrCode={template.qrCode}
              onSave={handleSave}
              saving={saving}
            />
          ) : (
            <div className="text-center py-20">
              <p className="text-sm text-[var(--color-muted)]">Template not found.</p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
