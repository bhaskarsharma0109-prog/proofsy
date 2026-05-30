"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";
import { TEMPLATE_DEFINITIONS } from "@/lib/templates";

interface Recipient {
  id: string;
  name: string;
  email: string;
}

export default function CreateEventPage({ initialTemplate }: { initialTemplate?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [manuallySelectedTemplate, setManuallySelectedTemplate] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [tab, setTab] = useState<"manual" | "csv">("manual");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [duration, setDuration] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const selectedTemplate = useMemo(() => {
    if (manuallySelectedTemplate) {
      return manuallySelectedTemplate;
    }

    if (initialTemplate && TEMPLATE_DEFINITIONS.some((template) => template.id === initialTemplate)) {
      return initialTemplate;
    }

    return "modern";
  }, [initialTemplate, manuallySelectedTemplate]);

  const addRecipient = () => {
    if (!newName.trim() || !newEmail.trim()) return;
    setRecipients([...recipients, { id: Date.now().toString(), name: newName.trim(), email: newEmail.trim().toLowerCase() }]);
    setNewName("");
    setNewEmail("");
  };

  const removeRecipient = (id: string) => {
    setRecipients(recipients.filter((r) => r.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]?.name.endsWith(".csv")) setFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    // Step 1: Create event
    const eventRes = await api.createEvent({
      name: eventName,
      date: eventDate,
      organizerName: organizer,
      templateId: selectedTemplate,
      duration: duration || undefined,
    });

    if (!eventRes.success || !eventRes.data) {
      setSubmitError(eventRes.error || "Failed to create event");
      setSubmitting(false);
      return;
    }

    // Step 2: If CSV file provided, generate certificates
    if (file) {
      const genRes = await api.generateCertificates(eventRes.data.id, file);
      if (!genRes.success) {
        setSubmitError(genRes.error || "Event created, but certificate generation failed");
        setSubmitting(false);
        return;
      }
    }

    // Step 3: If manual recipients, create a temporary CSV and upload
    if (recipients.length > 0 && !file) {
      const csvContent = "name,email\n" + recipients.map(r => `${r.name},${r.email}`).join("\n");
      const csvBlob = new Blob([csvContent], { type: "text/csv" });
      const csvFile = new File([csvBlob], "recipients.csv", { type: "text/csv" });
      const genRes = await api.generateCertificates(eventRes.data.id, csvFile);
      if (!genRes.success) {
        setSubmitError(genRes.error || "Event created, but certificate generation failed");
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    router.push("/");
  };

  const stepTitles = ["Choose Template", "Event Details", "Add Recipients", "Review & Create"];

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[var(--color-surface)]/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5">
          <h2 className="text-xl font-bold text-[var(--color-foreground)]">Create New Event</h2>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Set up an event, choose a template, and add recipients.</p>
        </header>

        <div className="px-8 py-8 max-w-4xl">
          {/* Progress steps */}
          <div className="flex items-center gap-2 mb-8">
            {stepTitles.map((title, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => setStep(i + 1)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer
                    ${step === i + 1 ? "bg-[var(--color-primary)] text-white" : step > i + 1 ? "bg-[var(--color-success-bg)] text-[var(--color-success)]" : "bg-[var(--color-surface-alt)] text-[var(--color-muted)]"}`}
                >
                  <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px]
                    ${step > i + 1 ? 'border-current' : 'border-current'}">
                    {step > i + 1 ? "✓" : i + 1}
                  </span>
                  <span className="hidden sm:inline">{title}</span>
                </button>
                {i < 3 && <div className="w-8 h-px bg-[var(--color-border)]" />}
              </div>
            ))}
          </div>

          {/* Step 1: Template Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-foreground)]">Choose a Certificate Template</h3>
                <p className="text-sm text-[var(--color-muted)] mt-1">Select a design that matches your event style.</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {TEMPLATE_DEFINITIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setManuallySelectedTemplate(t.id)}
                    className={`relative rounded-2xl border-2 p-1 cursor-pointer text-left group
                      ${selectedTemplate === t.id ? `${t.accent} shadow-md` : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:shadow-sm"}`}
                  >
                    {/* Preview */}
                    <div className={`bg-gradient-to-br ${t.color} rounded-xl h-36 flex flex-col items-center justify-center relative overflow-hidden`}>
                      {/* Mini certificate mockup */}
                      <div className="w-24 h-16 bg-white rounded shadow-sm border flex flex-col items-center justify-center">
                        <div className="w-10 h-1 bg-gray-300 rounded mb-1" />
                        <div className="w-14 h-1.5 bg-gray-400 rounded mb-1" />
                        <div className="w-8 h-1 bg-gray-300 rounded" />
                      </div>
                      {selectedTemplate === t.id && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-3">
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">{t.name}</p>
                      <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={() => setStep(2)} className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[var(--color-primary-dark)] cursor-pointer">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Event Details */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-foreground)]">Event Details</h3>
                <p className="text-sm text-[var(--color-muted)] mt-1">Basic information about your event.</p>
              </div>
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-foreground)]">Event Name *</label>
                  <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. Q3 Engineering All-Hands" className="w-full border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-muted)]/50" />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[var(--color-foreground)]">Event Date *</label>
                    <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[var(--color-foreground)]">Duration</label>
                    <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 10 Hours, 3 Days" className="w-full border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-muted)]/50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-foreground)]">Organizer Name *</label>
                  <input type="text" value={organizer} onChange={(e) => setOrganizer(e.target.value)} placeholder="e.g. Acme Corp Training Dept." className="w-full border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-muted)]/50" />
                </div>
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="px-5 py-2.5 border border-[var(--color-border)] rounded-xl text-sm font-medium hover:bg-[var(--color-surface-alt)] cursor-pointer">← Back</button>
                <button onClick={() => setStep(3)} className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[var(--color-primary-dark)] cursor-pointer">Continue →</button>
              </div>
            </div>
          )}

          {/* Step 3: Recipients */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-foreground)]">Add Recipients</h3>
                <p className="text-sm text-[var(--color-muted)] mt-1">Add people who will receive certificates.</p>
              </div>

              {/* Tab switcher */}
              <div className="flex gap-1 bg-[var(--color-surface-alt)] p-1 rounded-xl w-fit">
                <button onClick={() => setTab("manual")} className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${tab === "manual" ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-foreground)]" : "text-[var(--color-muted)]"}`}>
                  Add Manually
                </button>
                <button onClick={() => setTab("csv")} className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${tab === "csv" ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-foreground)]" : "text-[var(--color-muted)]"}`}>
                  Upload CSV
                </button>
              </div>

              {tab === "manual" && (
                <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 space-y-5">
                  {/* Add form */}
                  <div className="flex gap-3">
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} type="text" placeholder="Full Name" className="flex-1 border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-muted)]/50" />
                    <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="Email Address" onKeyDown={(e) => e.key === "Enter" && addRecipient()} className="flex-1 border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-muted)]/50" />
                    <button onClick={addRecipient} className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] cursor-pointer shrink-0">
                      Add
                    </button>
                  </div>

                  {/* Recipients list */}
                  {recipients.length > 0 ? (
                    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-[var(--color-surface-alt)]">
                            <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Name</th>
                            <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Email</th>
                            <th className="px-4 py-2.5 w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                          {recipients.map((r) => (
                            <tr key={r.id} className="hover:bg-[var(--color-surface-alt)]">
                              <td className="px-4 py-3 text-sm font-medium">{r.name}</td>
                              <td className="px-4 py-3 text-sm text-[var(--color-muted)]">{r.email}</td>
                              <td className="px-4 py-3">
                                <button onClick={() => removeRecipient(r.id)} className="text-[var(--color-error)] hover:text-red-700 cursor-pointer">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[var(--color-muted)]">
                      <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
                      <p className="text-sm">No recipients added yet.</p>
                      <p className="text-xs mt-1">Enter a name and email above, or switch to CSV upload.</p>
                    </div>
                  )}
                  <p className="text-xs text-[var(--color-muted)]">{recipients.length} recipient{recipients.length !== 1 ? "s" : ""} added</p>
                </div>
              )}

              {tab === "csv" && (
                <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 space-y-4">
                  <div
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
                      ${isDragging ? "border-[var(--color-primary)] bg-[var(--color-primary-faint)]" : file ? "border-[var(--color-success)] bg-[var(--color-success-bg)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-alt)]"}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
                    {file ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-success)] flex items-center justify-center"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></div>
                        <p className="text-sm font-semibold text-[var(--color-success)]">{file.name}</p>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-xs text-[var(--color-error)] hover:underline cursor-pointer">Remove</button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-8 h-8 text-[var(--color-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                        <p className="text-sm">Drop CSV here or <span className="text-[var(--color-primary)] font-medium">browse</span></p>
                        <p className="text-xs text-[var(--color-muted)]">Required columns: name, email</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button onClick={() => setStep(2)} className="px-5 py-2.5 border border-[var(--color-border)] rounded-xl text-sm font-medium hover:bg-[var(--color-surface-alt)] cursor-pointer">← Back</button>
                <button onClick={() => setStep(4)} className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[var(--color-primary-dark)] cursor-pointer">Continue →</button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-foreground)]">Review & Create</h3>
                <p className="text-sm text-[var(--color-muted)] mt-1">Confirm your event setup before generating certificates.</p>
              </div>

              {submitError && (
                <div className="bg-[var(--color-error-bg)] border border-[var(--color-error)] rounded-xl px-5 py-3 text-sm text-[var(--color-error)]">
                  {submitError}
                </div>
              )}

              <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Template</p>
                    <p className="text-sm font-semibold mt-1 capitalize">{selectedTemplate}</p>
                  </div>
                  <button onClick={() => setStep(1)} className="text-xs text-[var(--color-primary)] font-medium hover:underline cursor-pointer">Change</button>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Event</p>
                    <p className="text-sm font-semibold mt-1">{eventName || "Not set"} — {eventDate || "No date"}</p>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">Organized by {organizer || "Not set"}</p>
                  </div>
                  <button onClick={() => setStep(2)} className="text-xs text-[var(--color-primary)] font-medium hover:underline cursor-pointer">Change</button>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Recipients</p>
                    <p className="text-sm font-semibold mt-1">{recipients.length} manual{file ? ` + CSV (${file.name})` : ""}</p>
                  </div>
                  <button onClick={() => setStep(3)} className="text-xs text-[var(--color-primary)] font-medium hover:underline cursor-pointer">Change</button>
                </div>
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep(3)} className="px-5 py-2.5 border border-[var(--color-border)] rounded-xl text-sm font-medium hover:bg-[var(--color-surface-alt)] cursor-pointer">← Back</button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !eventName || !eventDate || !organizer}
                  className="bg-[var(--color-primary)] text-white px-8 py-2.5 rounded-xl font-semibold text-sm hover:bg-[var(--color-primary-dark)] cursor-pointer shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" /></svg>
                      Create Event & Generate Certificates
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
