"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { api, BACKEND_URL, BrandingData } from "@/lib/api";

const defaultBranding: BrandingData = {
  logo: "",
  primaryColor: "#2563EB",
  accentColor: "#16A34A",
  customDomain: "",
  brandingEnabled: false,
  verificationPageTitle: "",
  footerText: "",
};

export default function BrandingSettingsPage() {
  const [branding, setBranding] = useState<BrandingData>(defaultBranding);
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("Workspace");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBranding() {
      let activeWorkspaceId = localStorage.getItem("proofsy_workspace_id") || "";
      if (!activeWorkspaceId) {
        const workspaces = await api.listWorkspaces();
        if (workspaces.success && workspaces.data?.[0]?._id) {
          activeWorkspaceId = workspaces.data[0]._id;
          localStorage.setItem("proofsy_workspace_id", activeWorkspaceId);
        }
      }

      if (!activeWorkspaceId) {
        setError("No active workspace found.");
        setLoading(false);
        return;
      }

      setWorkspaceId(activeWorkspaceId);
      const res = await api.getBranding(activeWorkspaceId);
      if (res.success && res.data) {
        setWorkspaceName(res.data.workspaceName);
        setBranding({
          ...defaultBranding,
          ...res.data.branding,
          workspaceId: res.data.workspaceId,
          workspaceName: res.data.workspaceName,
        });
      } else {
        setError(res.error || "Unable to load branding settings.");
      }
      setLoading(false);
    }

    loadBranding();
  }, []);

  const updateField = (field: keyof BrandingData, value: string | boolean) => {
    setBranding((current) => ({ ...current, [field]: value }));
    setMessage(null);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    const res = await api.updateBranding({
      logo: branding.logo,
      primaryColor: branding.primaryColor,
      accentColor: branding.accentColor,
      customDomain: branding.customDomain,
      brandingEnabled: branding.brandingEnabled,
      verificationPageTitle: branding.verificationPageTitle,
      footerText: branding.footerText,
    });

    if (res.success && res.data) {
      setBranding({
        ...defaultBranding,
        ...res.data.branding,
        workspaceId: res.data.workspaceId,
        workspaceName: res.data.workspaceName,
      });
      setMessage("Branding settings saved.");
    } else {
      setError(res.error || "Failed to save branding settings.");
    }
    setSaving(false);
  };

  const handleLogoUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    setError(null);
    const res = await api.uploadBrandingLogo(file);
    if (res.success && res.data) {
      setBranding((current) => ({ ...current, ...res.data!.branding }));
      setMessage("Logo uploaded.");
    } else {
      setError(res.error || "Failed to upload logo.");
    }
    setUploading(false);
  };

  const logoSrc = branding.logo && branding.logo.startsWith("/storage")
    ? `${BACKEND_URL}${branding.logo}`
    : branding.logo;

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5">
          <h1 className="text-xl font-bold text-[var(--color-foreground)]">White-Label Branding</h1>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">
            Customize the verification experience for {workspaceName}.
          </p>
        </header>

        <div className="px-8 py-8">
          {loading ? (
            <div className="bg-white border border-[var(--color-border)] rounded-2xl px-6 py-16 text-center text-sm text-[var(--color-muted)]">
              Loading branding settings...
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
              <section className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[var(--color-foreground)]">Brand Controls</h2>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">These settings apply to public verification results.</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[var(--color-foreground)]">
                    <input
                      type="checkbox"
                      checked={branding.brandingEnabled}
                      onChange={(event) => updateField("brandingEnabled", event.target.checked)}
                      className="w-4 h-4 rounded border-[var(--color-border)]"
                    />
                    Enable branding
                  </label>
                </div>

                <div className="p-6 space-y-6">
                  {(message || error) && (
                    <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${error ? "bg-red-50 text-red-700 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"}`}>
                      {error || message}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">Verification Page Title</label>
                      <input
                        value={branding.verificationPageTitle}
                        onChange={(event) => updateField("verificationPageTitle", event.target.value)}
                        placeholder="Official Credential Verification"
                        className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">Custom Domain</label>
                      <input
                        value={branding.customDomain}
                        onChange={(event) => updateField("customDomain", event.target.value)}
                        placeholder="verify.example.edu"
                        className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">Primary Color</label>
                      <div className="flex gap-2">
                        <input type="color" value={branding.primaryColor} onChange={(event) => updateField("primaryColor", event.target.value)} className="h-12 w-14 rounded-lg border border-[var(--color-border)] bg-white" />
                        <input value={branding.primaryColor} onChange={(event) => updateField("primaryColor", event.target.value)} className="flex-1 border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm font-mono" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">Accent Color</label>
                      <div className="flex gap-2">
                        <input type="color" value={branding.accentColor} onChange={(event) => updateField("accentColor", event.target.value)} className="h-12 w-14 rounded-lg border border-[var(--color-border)] bg-white" />
                        <input value={branding.accentColor} onChange={(event) => updateField("accentColor", event.target.value)} className="flex-1 border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm font-mono" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">Logo</label>
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <input
                        value={branding.logo}
                        onChange={(event) => updateField("logo", event.target.value)}
                        placeholder="https://example.edu/logo.png"
                        className="flex-1 border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      />
                      <label className="inline-flex justify-center cursor-pointer border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm font-semibold hover:bg-[var(--color-surface-alt)]">
                        {uploading ? "Uploading..." : "Upload Logo"}
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => handleLogoUpload(event.target.files?.[0])} />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">Footer Text</label>
                    <textarea
                      rows={3}
                      value={branding.footerText}
                      onChange={(event) => updateField("footerText", event.target.value)}
                      placeholder="Issued and verified by Example University."
                      className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)] resize-none"
                    />
                  </div>

                  <div className="pt-4 border-t border-[var(--color-border)] flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={saving || !workspaceId}
                      className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Branding"}
                    </button>
                  </div>
                </div>
              </section>

              <aside className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden h-fit">
                <div className="px-6 py-4 border-b border-[var(--color-border)]">
                  <h2 className="text-sm font-bold text-[var(--color-foreground)]">Verification Preview</h2>
                </div>
                <div className="p-6">
                  <div className="rounded-2xl border overflow-hidden" style={{ borderColor: branding.brandingEnabled ? branding.accentColor : "#E2E8F0" }}>
                    <div className="px-5 py-4 flex items-center gap-3" style={{ backgroundColor: `${branding.primaryColor}12` }}>
                      {logoSrc ? (
                        <img src={logoSrc} alt={workspaceName} className="w-10 h-10 rounded-lg object-contain bg-white border border-white" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg text-white flex items-center justify-center text-sm font-bold" style={{ backgroundColor: branding.primaryColor }}>
                          {workspaceName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold" style={{ color: branding.primaryColor }}>
                          {branding.verificationPageTitle || "Certificate Verified"}
                        </p>
                        <p className="text-[10px] text-[var(--color-muted)]">{workspaceName}</p>
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Recipient</p>
                        <p className="text-sm font-semibold text-[var(--color-foreground)]">Aarav Sharma</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Credential</p>
                        <p className="text-sm font-semibold text-[var(--color-foreground)]">National Level Tech Fest 2026</p>
                      </div>
                      <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase" style={{ color: branding.accentColor, backgroundColor: `${branding.accentColor}14` }}>
                        Verified
                      </span>
                    </div>
                    <div className="px-5 py-3 border-t border-[var(--color-border)] text-[10px] text-[var(--color-muted)]">
                      {branding.footerText || "Powered by Proofsy. Certificate authenticity guaranteed."}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
