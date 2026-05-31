"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { api, BACKEND_URL, TemplateListItem, CustomFontData } from "@/lib/api";
import { pageVariants, staggerContainer, fadeUp, headerSlide, scaleUp, pulseGlow, cardHover, cardTap } from "@/lib/animations";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const [customFonts, setCustomFonts] = useState<CustomFontData[]>([]);
  const [fontName, setFontName] = useState("");
  const [fontWeight, setFontWeight] = useState<"normal" | "bold">("normal");
  const [fontFile, setFontFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function load() {
      const [res, fontsRes] = await Promise.all([
        api.listTemplates(),
        api.getCustomFonts(),
      ]);
      if (res.success && res.data) {
        setTemplates(res.data);
      }
      if (fontsRes.success && fontsRes.data) {
        setCustomFonts(fontsRes.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Dynamically load custom fonts into the document's head via @font-face for font previews
  useEffect(() => {
    if (customFonts.length === 0) return;
    const styleId = "custom-fonts-previews-style";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = customFonts
      .map(
        (font) => `
        @font-face {
          font-family: '${font.family}';
          src: url('${BACKEND_URL}${font.fontUrl}') format('truetype');
          font-weight: ${font.fontWeight === "bold" ? "bold" : "normal"};
          font-style: normal;
        }
      `
      )
      .join("\n");
  }, [customFonts]);

  const handleFontUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fontName.trim()) {
      setErrorMsg("Font name is required");
      return;
    }
    if (!fontFile) {
      setErrorMsg("Please select a .ttf font file");
      return;
    }
    setErrorMsg("");
    setUploading(true);

    const formData = new FormData();
    formData.append("name", fontName.trim());
    formData.append("fontWeight", fontWeight);
    formData.append("fontFile", fontFile);

    const res = await api.uploadCustomFont(formData);
    if (res.success && res.data) {
      setCustomFonts((prev) => [res.data!, ...prev]);
      setFontName("");
      setFontFile(null);
      const fileInput = document.getElementById("font-file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } else {
      setErrorMsg(res.error || "Failed to upload custom font");
    }
    setUploading(false);
  };

  const handleFontDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete custom font "${name}"?`)) return;
    const res = await api.deleteCustomFont(id);
    if (res.success) {
      setCustomFonts((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    await api.seedTemplates();
    const res = await api.listTemplates();
    if (res.success && res.data) {
      setTemplates(res.data);
    }
    setSeeding(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete template "${name}"?`)) return;
    const res = await api.deleteTemplate(id);
    if (res.success) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-20 right-12 w-60 h-60 bg-amber-200/15 rounded-full blur-3xl pointer-events-none" />
        <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: "1.2s" }} className="absolute bottom-28 left-20 w-52 h-52 bg-cyan-200/10 rounded-full blur-3xl pointer-events-none" />

        <motion.header variants={headerSlide} initial="hidden" animate="visible" className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">Certificate Templates</h2>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">Upload backgrounds and design your certificate layouts.</p>
          </div>
          <div className="flex items-center gap-3">
            {templates.length === 0 && !loading && (
              <motion.button
                whileTap={cardTap}
                onClick={handleSeed}
                disabled={seeding}
                className="border border-[var(--color-border)] text-[var(--color-foreground)] px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--color-surface-alt)] cursor-pointer disabled:opacity-50"
              >
                {seeding ? "Loading..." : "Load Starter Templates"}
              </motion.button>
            )}
            <motion.div whileHover={cardHover} whileTap={cardTap}>
              <Link
                href="/templates/new"
                className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl hover:bg-[var(--color-primary-dark)] font-semibold text-sm shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                New Template
              </Link>
            </motion.div>
          </div>
        </motion.header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 relative z-[1]">
          {loading ? (
            <div className="text-center py-20">
              <svg className="w-6 h-6 animate-spin mx-auto text-[var(--color-muted)]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              <p className="text-sm text-[var(--color-muted)] mt-3">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] px-6 py-16 text-center max-w-md mx-auto">
              <svg className="w-16 h-16 mx-auto text-[var(--color-muted)] opacity-20 mb-4" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
              <p className="text-base font-bold text-[var(--color-foreground)]">No templates yet</p>
              <p className="text-sm text-[var(--color-muted)] mt-1 mb-6">Create your first template or load the 6 beautiful starter templates.</p>
              <div className="flex gap-3 justify-center">
                <motion.button
                  whileTap={cardTap}
                  onClick={handleSeed}
                  disabled={seeding}
                  className="border border-[var(--color-border)] text-[var(--color-foreground)] px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--color-surface-alt)] cursor-pointer disabled:opacity-50"
                >
                  {seeding ? "Loading..." : "Load Starters"}
                </motion.button>
                <Link
                  href="/templates/new"
                  className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] cursor-pointer"
                >
                  Upload Custom
                </Link>
              </div>
            </div>
          ) : (
            <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {templates.map((t) => (
                <motion.div
                  key={t.id}
                  variants={scaleUp}
                  whileHover={cardHover}
                  className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden hover:shadow-lg hover:border-[var(--color-border-strong)] cursor-pointer group"
                >
                  {/* Preview thumbnail */}
                  <div className="h-48 bg-[var(--color-surface-alt)] flex items-center justify-center relative overflow-hidden">
                    {t.backgroundType === "image" ? (
                      <img
                        src={`${BACKEND_URL}${t.backgroundUrl}`}
                        alt={t.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-[var(--color-muted)]">
                        <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                        <span className="text-xs font-medium">PDF Template</span>
                      </div>
                    )}
                    {t.isStarter && (
                      <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                        Starter
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-bold text-[var(--color-foreground)]">{t.name}</h3>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-muted)]">
                        {t.textLayerCount} layers
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-muted)]">
                      {t.width}×{t.height}px · {t.backgroundType.toUpperCase()}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Link href={`/templates/${t.id}`} className="flex-1 text-center py-2 border border-[var(--color-border)] rounded-lg text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface-alt)] cursor-pointer">
                        Edit
                      </Link>
                      <Link
                        href={`/events/new?template=${t.id}`}
                        className="flex-1 text-center py-2 bg-[var(--color-primary)] text-white rounded-lg text-xs font-semibold hover:bg-[var(--color-primary-dark)] cursor-pointer"
                      >
                        Use this
                      </Link>
                      {!t.isStarter && (
                        <button
                          onClick={(e) => { e.preventDefault(); handleDelete(t.id, t.name); }}
                          className="px-3 py-2 text-xs text-[var(--color-error)] hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Custom Fonts Section */}
          <motion.section variants={fadeUp} className="bg-white rounded-2xl border border-[var(--color-border)] p-6 mt-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-[var(--color-foreground)]">Institutional Custom Fonts</h3>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">Upload and register official TrueType (.ttf) typefaces for your certificate layouts.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-6">
              {/* Left Column: Upload Form */}
              <form onSubmit={handleFontUpload} className="lg:col-span-2 space-y-4 bg-[var(--color-surface-alt)] p-5 rounded-2xl border border-[var(--color-border)]/50">
                <h4 className="text-sm font-bold text-[var(--color-foreground)]">Add Custom Font</h4>
                
                {errorMsg && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--color-muted)] font-medium">Font Family Name</label>
                  <input
                    type="text"
                    placeholder="e.g. University Garamond"
                    value={fontName}
                    onChange={(e) => setFontName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[var(--color-border)] rounded-xl bg-white text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-primary)] font-medium"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs text-[var(--color-muted)] font-medium">Font Weight</label>
                    <select
                      value={fontWeight}
                      onChange={(e) => setFontWeight(e.target.value as "normal" | "bold")}
                      className="w-full px-3 py-2 text-xs border border-[var(--color-border)] rounded-xl bg-white text-[var(--color-foreground)] focus:outline-none font-medium"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-[var(--color-muted)] font-medium">File (.ttf)</label>
                    <input
                      id="font-file-input"
                      type="file"
                      accept=".ttf"
                      onChange={(e) => setFontFile(e.target.files?.[0] || null)}
                      className="w-full px-2 py-1 text-xs border border-[var(--color-border)] rounded-xl bg-white text-[var(--color-foreground)] focus:outline-none file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-[var(--color-primary)] hover:file:bg-indigo-100 cursor-pointer"
                      required
                    />
                  </div>
                </div>

                <motion.button
                  whileTap={cardTap}
                  type="submit"
                  disabled={uploading}
                  className="w-full py-2 bg-[var(--color-primary)] text-white font-semibold text-xs rounded-xl hover:bg-[var(--color-primary-dark)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {uploading ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      Upload Font
                    </>
                  )}
                </motion.button>
              </form>

              {/* Right Column: Fonts List */}
              <div className="lg:col-span-3 space-y-4">
                <h4 className="text-sm font-bold text-[var(--color-foreground)]">Workspace Custom Fonts</h4>
                
                {customFonts.length === 0 ? (
                  <div className="py-12 border border-dashed border-[var(--color-border)] rounded-2xl text-center flex flex-col items-center justify-center p-6">
                    <svg className="w-8 h-8 text-[var(--color-muted)] mb-2 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                    <h5 className="text-xs font-semibold text-[var(--color-foreground)]">No custom fonts uploaded</h5>
                    <p className="text-[10px] text-[var(--color-muted)] mt-0.5 max-w-[240px]">Standard Google Fonts (Poppins, Inter, Lora, etc.) are active. Upload TTF files to add restricted institutional typefaces.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                    {customFonts.map((font) => (
                      <div key={font.id} className="p-4 bg-white border border-[var(--color-border)] rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate">
                            <h5 className="text-xs font-bold text-[var(--color-foreground)] truncate">{font.name}</h5>
                            <p className="text-[9px] font-mono text-[var(--color-muted)] truncate">{font.family} ({font.fontWeight})</p>
                          </div>
                          <button
                            onClick={() => handleFontDelete(font.id, font.name)}
                            className="text-[var(--color-error)] opacity-0 group-hover:opacity-100 hover:bg-red-50 p-1.5 rounded-lg transition-opacity cursor-pointer shrink-0"
                            title="Delete font"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </button>
                        </div>

                        {/* Interactive Font Preview Box */}
                        <div className="mt-4 p-2 bg-[var(--color-surface-alt)]/50 rounded-xl text-center select-none border border-[var(--color-border)]/30">
                          <p
                            style={{ fontFamily: font.family }}
                            className="text-sm truncate py-1 text-[var(--color-foreground)] font-medium"
                          >
                            AaBbCc - Academic Preview
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        </motion.div>
      </main>
    </div>
  );
}
