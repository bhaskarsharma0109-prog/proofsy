"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { pageVariants, staggerContainer, fadeUp, headerSlide, cardHover, pulseGlow, cardTap } from "@/lib/animations";
import { api } from "@/lib/api";

const starterIntegrations = [
  { name: "Zapier", desc: "Connect Proofsy with 5,000+ apps using automated workflows.", icon: "⚡", category: "Automation", status: "available" as const },
  { name: "Webhooks", desc: "Send real-time event data to any URL endpoint.", icon: "🔗", category: "Developer", status: "available" as const },
  { name: "Google Sheets", desc: "Sync recipient data directly from Google Sheets.", icon: "📊", category: "Data", status: "available" as const },
  { name: "Slack", desc: "Get notifications when credentials are issued or verified.", icon: "💬", category: "Communication", status: "available" as const },
  { name: "HubSpot", desc: "Sync credential data with your CRM contacts.", icon: "🎯", category: "CRM", status: "coming" as const },
  { name: "REST API", desc: "Full API access for custom integrations and workflows.", icon: "🛠️", category: "Developer", status: "available" as const },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Record<string, { connected?: boolean, webhookUrl?: string, sheetUrl?: string, apiKey?: string }>>({});
  const [watchlist, setWatchlist] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Zapier Modal State
  const [zapierModalOpen, setZapierModalOpen] = useState(false);
  const [zapierWebhookUrl, setZapierWebhookUrl] = useState("");
  const [savingZapier, setSavingZapier] = useState(false);

  // Google Sheets Modal State
  const [googleSheetsModalOpen, setGoogleSheetsModalOpen] = useState(false);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState("");
  const [savingGoogleSheets, setSavingGoogleSheets] = useState(false);

  // REST API Modal State
  const [restApiModalOpen, setRestApiModalOpen] = useState(false);
  const [restApiKey, setRestApiKey] = useState("");
  const [savingRestApi, setSavingRestApi] = useState(false);
  const [copied, setCopied] = useState(false);

  // Slack Modal State
  const [slackModalOpen, setSlackModalOpen] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [savingSlack, setSavingSlack] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadIntegrations() {
      try {
        const res = await api.getIntegrations();
        if (active && res.success && res.data) {
          const data = res.data as Record<string, { connected?: boolean; webhookUrl?: string; sheetUrl?: string; apiKey?: string }>;
          setIntegrations(data);
          if (data.zapier?.webhookUrl) {
            setZapierWebhookUrl(data.zapier.webhookUrl);
          }
          if (data.googleSheets?.sheetUrl) {
            setGoogleSheetsUrl(data.googleSheets.sheetUrl);
          }
          if (data.restApi?.apiKey) {
            setRestApiKey(data.restApi.apiKey);
          }
          if (data.slack?.webhookUrl) {
            setSlackWebhookUrl(data.slack.webhookUrl);
          }
        }
      } catch (err) {
        console.error("Failed to load integrations", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadIntegrations();
    return () => { active = false; };
  }, []);

  const handleZapierSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingZapier(true);
    
    // If saving an empty URL, we disconnect. Otherwise we connect.
    const isConnecting = zapierWebhookUrl.trim().length > 0;
    
    try {
      const res = await api.updateZapierIntegration(isConnecting, zapierWebhookUrl.trim());
      if (res.success && res.data) {
        const zapierData = res.data as { connected?: boolean; webhookUrl?: string };
        setIntegrations((prev) => ({
          ...prev,
          zapier: zapierData
        }));
        setZapierModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to save Zapier", err);
    } finally {
      setSavingZapier(false);
    }
  };

  const handleZapierDisconnect = async () => {
    setSavingZapier(true);
    try {
      const res = await api.updateZapierIntegration(false, "");
      if (res.success && res.data) {
        const zapierData = res.data as { connected?: boolean; webhookUrl?: string };
        setIntegrations((prev) => ({
          ...prev,
          zapier: zapierData
        }));
        setZapierWebhookUrl("");
      }
    } catch (err) {
      console.error("Failed to disconnect Zapier", err);
    } finally {
      setSavingZapier(false);
    }
  };

  const handleGoogleSheetsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGoogleSheets(true);
    
    const isConnecting = googleSheetsUrl.trim().length > 0;
    
    try {
      const res = await api.updateGoogleSheetsIntegration(isConnecting, googleSheetsUrl.trim());
      if (res.success && res.data) {
        const sheetData = res.data as { connected?: boolean; sheetUrl?: string };
        setIntegrations((prev) => ({
          ...prev,
          googleSheets: sheetData
        }));
        setGoogleSheetsModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to save Google Sheets", err);
    } finally {
      setSavingGoogleSheets(false);
    }
  };

  const handleGoogleSheetsDisconnect = async () => {
    setSavingGoogleSheets(true);
    try {
      const res = await api.updateGoogleSheetsIntegration(false, "");
      if (res.success && res.data) {
        const sheetData = res.data as { connected?: boolean; sheetUrl?: string };
        setIntegrations((prev) => ({
          ...prev,
          googleSheets: sheetData
        }));
        setGoogleSheetsUrl("");
      }
    } catch (err) {
      console.error("Failed to disconnect Google Sheets", err);
    } finally {
      setSavingGoogleSheets(false);
    }
  };

  const handleRestApiConnect = async () => {
    setSavingRestApi(true);
    try {
      const res = await api.updateRestApiIntegration(true);
      if (res.success && res.data) {
        const restApiData = res.data as { connected?: boolean; apiKey?: string };
        setIntegrations((prev) => ({
          ...prev,
          restApi: restApiData
        }));
        if (restApiData.apiKey) {
          setRestApiKey(restApiData.apiKey);
        }
        setRestApiModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to connect REST API", err);
    } finally {
      setSavingRestApi(false);
    }
  };

  const handleRestApiRegenerate = async () => {
    setSavingRestApi(true);
    try {
      const res = await api.updateRestApiIntegration(true, true);
      if (res.success && res.data) {
        const restApiData = res.data as { connected?: boolean; apiKey?: string };
        setIntegrations((prev) => ({
          ...prev,
          restApi: restApiData
        }));
        if (restApiData.apiKey) {
          setRestApiKey(restApiData.apiKey);
        }
      }
    } catch (err) {
      console.error("Failed to regenerate REST API key", err);
    } finally {
      setSavingRestApi(false);
    }
  };

  const handleRestApiDisconnect = async () => {
    setSavingRestApi(true);
    try {
      const res = await api.updateRestApiIntegration(false);
      if (res.success && res.data) {
        const restApiData = res.data as { connected?: boolean; apiKey?: string };
        setIntegrations((prev) => ({
          ...prev,
          restApi: restApiData
        }));
        setRestApiKey("");
        setRestApiModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to disconnect REST API", err);
    } finally {
      setSavingRestApi(false);
    }
  };

  const handleSlackSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSlack(true);
    
    const isConnecting = slackWebhookUrl.trim().length > 0;
    
    try {
      const res = await api.updateSlackIntegration(isConnecting, slackWebhookUrl.trim());
      if (res.success && res.data) {
        const slackData = res.data as { connected?: boolean; webhookUrl?: string };
        setIntegrations((prev) => ({
          ...prev,
          slack: slackData
        }));
        setSlackModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to save Slack", err);
    } finally {
      setSavingSlack(false);
    }
  };

  const handleSlackDisconnect = async () => {
    setSavingSlack(true);
    try {
      const res = await api.updateSlackIntegration(false, "");
      if (res.success && res.data) {
        const slackData = res.data as { connected?: boolean; webhookUrl?: string };
        setIntegrations((prev) => ({
          ...prev,
          slack: slackData
        }));
        setSlackWebhookUrl("");
      }
    } catch (err) {
      console.error("Failed to disconnect Slack", err);
    } finally {
      setSavingSlack(false);
    }
  };

  const handleGenericAction = (name: string) => {
    if (name === "Zapier") {
      const isConnected = integrations?.zapier?.connected;
      if (isConnected) {
        handleZapierDisconnect();
      } else {
        setZapierModalOpen(true);
      }
    } else if (name === "Google Sheets") {
      const isConnected = integrations?.googleSheets?.connected;
      if (isConnected) {
        handleGoogleSheetsDisconnect();
      } else {
        setGoogleSheetsModalOpen(true);
      }
    } else if (name === "REST API") {
      const isConnected = integrations?.restApi?.connected;
      if (isConnected) {
        setRestApiModalOpen(true);
      } else {
        handleRestApiConnect();
      }
    } else if (name === "Slack") {
      const isConnected = integrations?.slack?.connected;
      if (isConnected) {
        handleSlackDisconnect();
      } else {
        setSlackModalOpen(true);
      }
    } else {
      // Mock other available integrations
      const key = name === "Webhooks" ? "webhooks" : name.toLowerCase();
      const isConnected = integrations?.[key]?.connected;
      setIntegrations((prev) => ({
        ...prev,
        [key]: { connected: !isConnected }
      }));
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-20 right-10 w-56 h-56 bg-blue-200/15 rounded-full blur-3xl pointer-events-none" />
        <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: '1s' }} className="absolute bottom-20 left-32 w-64 h-64 bg-purple-200/10 rounded-full blur-3xl pointer-events-none" />

        <motion.header variants={headerSlide} initial="hidden" animate="visible" className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5">
          <h2 className="text-xl font-bold text-[var(--color-foreground)]">Integrations</h2>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Connect Proofsy with your favorite tools and services.</p>
        </motion.header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 relative z-[1]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
            </div>
          ) : (
            <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {starterIntegrations.map((integration) => {
                const key = integration.name === "Google Sheets" ? "googleSheets" : (integration.name === "REST API" ? "restApi" : integration.name.toLowerCase());
                const isConnected = integrations?.[key]?.connected;
                const isWatching = watchlist[integration.name];
                const isSaving = (savingZapier && integration.name === "Zapier") || (savingGoogleSheets && integration.name === "Google Sheets") || (savingRestApi && integration.name === "REST API") || (savingSlack && integration.name === "Slack");

                return (
                  <motion.div key={integration.name} variants={fadeUp} whileHover={cardHover} className="bg-white rounded-2xl border border-[var(--color-border)] p-6 hover:shadow-md hover:border-[var(--color-border-strong)] flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-alt)] flex items-center justify-center text-2xl shrink-0">{integration.icon}</div>
                      {integration.status === "coming" ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Coming Soon</span>
                      ) : isConnected ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]">Connected</span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-muted)]">Available</span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[var(--color-foreground)] mb-1">{integration.name}</h3>
                    <p className="text-xs text-[var(--color-muted)] leading-relaxed mb-6 flex-1">{integration.desc}</p>
                    <div className="flex items-center justify-between gap-3 mt-auto">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-muted)]">{integration.category}</span>
                      {integration.status === "available" ? (
                        <button
                          onClick={() => handleGenericAction(integration.name)}
                          disabled={isSaving}
                          className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors cursor-pointer ${
                            isConnected 
                              ? "border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-alt)]" 
                              : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
                          } disabled:opacity-50`}
                        >
                          {isSaving ? "..." : (isConnected ? (integration.name === "REST API" ? "Manage" : "Disconnect") : "Connect")}
                        </button>
                      ) : (
                        <button
                          onClick={() => setWatchlist((current) => ({ ...current, [integration.name]: !current[integration.name] }))}
                          className="text-xs font-semibold px-4 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)] cursor-pointer"
                        >
                          {isWatching ? "Watching" : "Notify Me"}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* Zapier Config Modal */}
      <AnimatePresence>
        {zapierModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setZapierModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-lg">⚡</div>
                  <h3 className="font-bold text-[var(--color-foreground)]">Connect Zapier</h3>
                </div>
                <button 
                  onClick={() => setZapierModalOpen(false)}
                  className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] cursor-pointer"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleZapierSave} className="p-6">
                <p className="text-sm text-[var(--color-muted)] mb-5">
                  To send new certificates to Zapier automatically, create a Zap with a <strong>Webhooks by Zapier (Catch Hook)</strong> trigger, and paste the generated URL here.
                </p>
                
                <div className="space-y-1.5 mb-6">
                  <label className="text-xs font-semibold text-[var(--color-foreground)]">Webhook URL</label>
                  <input
                    type="url"
                    required
                    value={zapierWebhookUrl}
                    onChange={(e) => setZapierWebhookUrl(e.target.value)}
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    className="w-full text-sm px-3 py-2.5 rounded-lg border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)] placeholder:text-gray-400"
                  />
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setZapierModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileTap={cardTap}
                    type="submit"
                    disabled={savingZapier || !zapierWebhookUrl}
                    className="px-5 py-2 text-sm font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50 cursor-pointer"
                  >
                    {savingZapier ? "Connecting..." : "Connect"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Sheets Config Modal */}
      <AnimatePresence>
        {googleSheetsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setGoogleSheetsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-lg">📊</div>
                  <h3 className="font-bold text-[var(--color-foreground)]">Connect Google Sheets</h3>
                </div>
                <button 
                  onClick={() => setGoogleSheetsModalOpen(false)}
                  className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] cursor-pointer"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleGoogleSheetsSave} className="p-6">
                <div className="space-y-4 mb-6">
                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-800 space-y-2">
                    <p className="font-semibold">Setup Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Ensure your sheet has <strong>name</strong> and <strong>email</strong> columns in the first row.</li>
                      <li>In Google Sheets, click <strong>Share</strong> (top right).</li>
                      <li>Change access to <strong>&quot;Anyone with the link can view&quot;</strong> (required for sync).</li>
                      <li>Copy the sheet URL and paste it below.</li>
                    </ol>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--color-foreground)]">Google Sheet URL</label>
                    <input
                      type="url"
                      required
                      value={googleSheetsUrl}
                      onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="w-full text-sm px-3 py-2.5 rounded-lg border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)] placeholder:text-gray-400"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setGoogleSheetsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileTap={cardTap}
                    type="submit"
                    disabled={savingGoogleSheets || !googleSheetsUrl}
                    className="px-5 py-2 text-sm font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50 cursor-pointer"
                  >
                    {savingGoogleSheets ? "Connecting..." : "Connect"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REST API Config Modal */}
      <AnimatePresence>
        {restApiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setRestApiModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-lg">🛠️</div>
                  <h3 className="font-bold text-[var(--color-foreground)]">Developer REST API</h3>
                </div>
                <button 
                  onClick={() => setRestApiModalOpen(false)}
                  className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] cursor-pointer"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <p className="text-sm text-[var(--color-muted)]">
                  Use the Developer API to programmatically list events and issue credentials from external applications. Keep your API key secure.
                </p>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-150 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--color-foreground)]">Developer API Key</span>
                    {copied ? (
                      <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">Copied!</span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={restApiKey}
                      className="w-full text-sm font-mono bg-white px-3 py-2 rounded-lg border border-[var(--color-border)] select-all focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(restApiKey);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-3 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-lg shrink-0 cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[var(--color-foreground)]">Quick Reference (cURL)</span>
                  <pre className="text-[11px] font-mono p-4 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto whitespace-pre leading-relaxed select-all">
{`curl -X POST "${typeof window !== 'undefined' ? window.location.origin : 'https://proofsy.co'}/api/v1/certificates" \\
  -H "Authorization: Bearer ${restApiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "eventId": "YOUR_EVENT_ID",
    "name": "John Doe",
    "email": "john@example.com"
  }'`}
                  </pre>
                </div>

                <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-5">
                  <button
                    onClick={handleRestApiDisconnect}
                    disabled={savingRestApi}
                    className="px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    Revoke Key (Disconnect)
                  </button>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleRestApiRegenerate}
                      disabled={savingRestApi}
                      className="px-4 py-2 text-xs font-semibold border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-alt)] rounded-lg transition-colors cursor-pointer"
                    >
                      Regenerate Key
                    </button>
                    <button
                      onClick={() => setRestApiModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] rounded-lg transition-colors cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Slack Config Modal */}
      <AnimatePresence>
        {slackModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSlackModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-lg">💬</div>
                  <h3 className="font-bold text-[var(--color-foreground)]">Connect Slack</h3>
                </div>
                <button 
                  onClick={() => setSlackModalOpen(false)}
                  className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] cursor-pointer"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleSlackSave} className="p-6">
                <div className="space-y-4 mb-6">
                  <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 text-xs text-purple-800 space-y-2">
                    <p className="font-semibold">Setup Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Go to your Slack workspace and create an <strong>Incoming Webhook</strong>.</li>
                      <li>Select the channel where you want certificate notifications to be posted.</li>
                      <li>Copy the generated Webhook URL and paste it below.</li>
                    </ol>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--color-foreground)]">Slack Webhook URL</label>
                    <input
                      type="url"
                      required
                      value={slackWebhookUrl}
                      onChange={(e) => setSlackWebhookUrl(e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full text-sm px-3 py-2.5 rounded-lg border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)] placeholder:text-gray-400"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSlackModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileTap={cardTap}
                    type="submit"
                    disabled={savingSlack || !slackWebhookUrl}
                    className="px-5 py-2 text-sm font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50 cursor-pointer"
                  >
                    {savingSlack ? "Connecting..." : "Connect"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
