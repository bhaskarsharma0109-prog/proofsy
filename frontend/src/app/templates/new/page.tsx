"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import TemplateEditor from "@/components/TemplateEditor";
import { api, TemplateData, TextLayer, QrCodeConfig } from "@/lib/api";
import { pageVariants, fadeUp, cardTap } from "@/lib/animations";

export default function NewTemplatePage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "editor">("upload");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedBgUrl, setUploadedBgUrl] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (f: File) => {
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleUpload = async () => {
    if (!name.trim()) {
      setError("Please enter a template name.");
      return;
    }
    if (!file) {
      setError("Please upload a background image or PDF.");
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("background", file);
    formData.append("width", "1056");
    formData.append("height", "746");

    const res = await api.createTemplate(formData);

    if (!res.success || !res.data) {
      setError(res.error || "Failed to create template.");
      setUploading(false);
      return;
    }

    setTemplateId(res.data._id);
    setUploadedBgUrl(res.data.backgroundUrl);
    setUploading(false);
    setStep("editor");
  };

  const handleSave = async (layers: TextLayer[], qrCode: QrCodeConfig) => {
    if (!templateId) return;
    setSaving(true);

    const res = await api.updateTemplate(templateId, {
      textLayers: layers,
      qrCode,
    } as Partial<TemplateData>);

    setSaving(false);

    if (res.success) {
      router.push("/templates");
    } else {
      setError(res.error || "Failed to save template.");
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">
              {step === "upload" ? "Create Template" : "Design Template"}
            </h2>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">
              {step === "upload"
                ? "Upload a background image or PDF for your certificate."
                : "Drag text variables onto the canvas to position them."}
            </p>
          </div>
          <button
            onClick={() => router.push("/templates")}
            className="border border-[var(--color-border)] text-[var(--color-foreground)] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--color-surface-alt)] cursor-pointer"
          >
            ← Back
          </button>
        </header>

        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="px-8 py-8"
        >
          {error && (
            <div className="bg-[var(--color-error-bg)] border border-red-200 rounded-xl px-5 py-3 mb-6 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === "upload" && (
            <motion.div variants={fadeUp} className="max-w-xl mx-auto space-y-6">
              {/* Template name */}
              <div>
                <label className="block text-sm font-semibold text-[var(--color-foreground)] mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Company Workshop Certificate"
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
                />
              </div>

              {/* File upload zone */}
              <div>
                <label className="block text-sm font-semibold text-[var(--color-foreground)] mb-2">
                  Background Image / PDF
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const f = e.dataTransfer.files[0];
                    if (f) handleFileSelect(f);
                  }}
                  className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-faint)] transition-colors"
                >
                  {previewUrl ? (
                    <div>
                      {file?.type === "application/pdf" ? (
                        <object
                          data={previewUrl}
                          type="application/pdf"
                          className="w-full max-h-48 mx-auto rounded-lg shadow mb-3 overflow-hidden"
                        >
                          <div className="p-4 bg-[var(--color-surface-alt)] rounded-lg text-sm">
                            PDF Preview available after upload.
                          </div>
                        </object>
                      ) : (
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-h-48 mx-auto rounded-lg shadow mb-3"
                        />
                      )}
                      <p className="text-sm text-[var(--color-foreground)] font-medium">
                        {file?.name}
                      </p>
                      <p className="text-xs text-[var(--color-muted)] mt-1">
                        Click or drop to replace
                      </p>
                    </div>
                  ) : (
                    <div>
                      <svg
                        className="w-12 h-12 mx-auto text-[var(--color-muted)] opacity-40 mb-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                        />
                      </svg>
                      <p className="text-sm font-medium text-[var(--color-foreground)]">
                        Drop your certificate background here
                      </p>
                      <p className="text-xs text-[var(--color-muted)] mt-1">
                        PNG, JPG, WebP, or PDF — max 20MB
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                  />
                </div>
              </div>

              {/* Upload button */}
              <motion.button
                whileTap={cardTap}
                onClick={handleUpload}
                disabled={uploading || !name.trim() || !file}
                className="w-full bg-[var(--color-primary)] text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-[var(--color-primary-dark)] disabled:opacity-50 cursor-pointer transition-colors"
              >
                {uploading ? "Uploading..." : "Continue to Editor →"}
              </motion.button>
            </motion.div>
          )}

          {step === "editor" && uploadedBgUrl && (
            <TemplateEditor
              backgroundUrl={uploadedBgUrl}
              width={1056}
              height={746}
              onSave={handleSave}
              saving={saving}
            />
          )}
        </motion.div>
      </main>
    </div>
  );
}
