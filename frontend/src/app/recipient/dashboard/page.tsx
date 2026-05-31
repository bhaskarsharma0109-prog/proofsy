"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api, RecipientPortalData, BACKEND_URL } from "@/lib/api";
import { clearRecipientEmail, loadRecipientEmail } from "@/lib/recipient-auth";
import { pageVariants, staggerContainer, fadeUp, cardHover, cardTap } from "@/lib/animations";
import LinkedInShareButton from "@/components/LinkedInShareButton";

export default function RecipientDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<RecipientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Profile State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [editLinkedIn, setEditLinkedIn] = useState("");
  const [editTwitter, setEditTwitter] = useState("");
  const [editPortfolioTitle, setEditPortfolioTitle] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function loadPortal() {
    const email = loadRecipientEmail();

    if (!email) {
      router.push("/recipient/login");
      return;
    }

    const res = await api.getUserCertificates();

    if (!res.success || !res.data) {
      setError(res.error || "Unable to load your recipient dashboard.");
      setLoading(false);
      return;
    }

    setData(res.data);
    
    // Initialize edit fields
    setEditName(res.data.user.name || "");
    setEditBio(res.data.user.bio || "");
    setEditPhoto(res.data.user.profilePhoto || "");
    setEditLinkedIn(res.data.user.linkedinUrl || "");
    setEditTwitter(res.data.user.twitterHandle || "");
    setEditPortfolioTitle(res.data.user.portfolioTitle || "");
    setEditIsPublic(res.data.user.isPublicProfile !== false);
    
    setLoading(false);
  }

  useEffect(() => {
    loadPortal();
  }, [router]);

  const handleLogout = () => {
    clearRecipientEmail();
    router.push("/recipient/login");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const res = await api.updateRecipientProfile({
      name: editName,
      bio: editBio,
      profilePhoto: editPhoto,
      linkedinUrl: editLinkedIn,
      twitterHandle: editTwitter,
      portfolioTitle: editPortfolioTitle,
      isPublicProfile: editIsPublic,
    });

    if (!res.success) {
      setSaveError(res.error || "Failed to update profile.");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    setIsEditOpen(false);
    loadPortal(); // Reload data
  };

  const handleCopyPortfolioLink = () => {
    if (!data) return;
    const url = `${window.location.origin}/recipient/${encodeURIComponent(data.user.email)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredCertificates = data?.certificates.filter((c) =>
    c.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.verificationCode.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center text-sm text-[var(--color-muted)]">
        <div className="w-12 h-12 rounded-full border-4 border-[var(--color-primary)] border-t-transparent animate-spin mb-4" />
        Loading recipient portfolio...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl border border-[var(--color-border)] p-8 max-w-md text-center shadow-xl">
          <h1 className="text-xl font-bold text-[var(--color-foreground)]">Portal unavailable</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{error || "We could not load your profile."}</p>
          <Link href="/recipient/login" className="inline-flex mt-5 bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
            Return to login
          </Link>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-indigo-50 border border-indigo-100">
              <Image src="/logo.svg" alt="Proofsy" width={24} height={24} className="object-contain" />
            </div>
            <div>
              <p className="text-base font-bold text-[var(--color-foreground)] leading-none">Proofsy</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-1 font-medium">Recipient Portal</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCopyPortfolioLink}
              className="text-xs font-semibold bg-white border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 text-[var(--color-foreground)] shadow-sm"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-500 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Share Portfolio
                </>
              )}
            </motion.button>
            <button onClick={handleLogout} className="text-sm font-semibold text-rose-600 hover:text-rose-700">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <motion.main variants={pageVariants} initial="hidden" animate="visible" className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Card Section */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white rounded-3xl border border-[var(--color-border)] p-8 shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${data.user.isPublicProfile !== false ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                {data.user.isPublicProfile !== false ? "Public Portfolio" : "Private Portfolio"}
              </span>
            </div>

            {/* Profile Photo */}
            <div className="mt-4 flex justify-center">
              {data.user.profilePhoto ? (
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-100 shadow-sm relative bg-white">
                  <Image src={data.user.profilePhoto} alt={data.user.name} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-3xl font-extrabold shadow-md shadow-indigo-200">
                  {getInitials(data.user.name)}
                </div>
              )}
            </div>

            <h2 className="mt-5 text-xl font-bold text-[var(--color-foreground)] leading-tight">
              {data.user.name}
            </h2>
            <p className="text-xs text-[var(--color-muted)] font-semibold mt-1 font-mono">{data.user.email}</p>

            {data.user.portfolioTitle && (
              <p className="mt-3 text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider bg-indigo-50/50 inline-block px-3 py-1 rounded-full border border-indigo-100/50">
                {data.user.portfolioTitle}
              </p>
            )}

            <p className="mt-4 text-sm text-[var(--color-muted)] leading-relaxed italic px-2">
              {data.user.bio || "No professional bio added yet. Tell organizations and colleagues about yourself!"}
            </p>

            {/* Social Links */}
            <div className="mt-6 flex items-center justify-center gap-3">
              {data.user.linkedinUrl && (
                <motion.a
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  href={data.user.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 hover:text-[#0077b5] hover:bg-blue-50 transition-colors"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.8v8.37h2.8v-4.67c0-.25.02-.5.1-.68a1.14 1.14 0 0 1 1-.77c.76 0 1 .58 1 1.42v4.7h2.8M6.5 8.37a1.37 1.37 0 1 0 0-2.75 1.37 1.37 0 0 0 0 2.75M8 18.5V10.13H5v8.37h3z" />
                  </svg>
                </motion.a>
              )}
              {data.user.twitterHandle && (
                <motion.a
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  href={`https://twitter.com/${data.user.twitterHandle.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 hover:text-sky-500 hover:bg-sky-50 transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </motion.a>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsEditOpen(true)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold py-3 px-4 rounded-xl shadow-sm transition-colors"
              >
                Customize Portfolio
              </motion.button>
            </div>
          </section>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Events</p>
              <p className="mt-2 text-3xl font-extrabold text-[var(--color-foreground)] leading-none">{data.totalEventsAttended}</p>
            </div>
            <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Credentials</p>
              <p className="mt-2 text-3xl font-extrabold text-[var(--color-foreground)] leading-none">{data.certificates.length}</p>
            </div>
          </div>
        </div>

        {/* Certificates Grid Section */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-3xl border border-[var(--color-border)] shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-[var(--color-border)] flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/50 backdrop-blur-sm sticky top-[73px] z-10">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--color-foreground)]">Portfolio Credentials</h2>
                <p className="text-xs text-[var(--color-muted)] mt-1 font-medium">Verify, share, or download your credentials.</p>
              </div>
              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Search by event or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[var(--color-primary)] focus:bg-white px-4 py-2.5 pl-9 rounded-xl outline-none transition-colors"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {filteredCertificates.length === 0 ? (
              <div className="px-8 py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-base font-bold text-[var(--color-foreground)] mt-4">
                  {searchQuery ? "No matching credentials" : "No certificates available"}
                </p>
                <p className="text-xs text-[var(--color-muted)] mt-1.5 max-w-sm mx-auto">
                  {searchQuery ? "Try searching for a different event name or verification code." : "Credentials will automatically show up once they are issued by an organizer."}
                </p>
              </div>
            ) : (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="divide-y divide-slate-100">
                {filteredCertificates.map((certificate) => (
                  <motion.article key={certificate.id} variants={fadeUp} whileHover={cardHover} className="px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5 transition-colors hover:bg-slate-50/50">
                    <div className="space-y-1">
                      <p className="text-base font-extrabold text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors">
                        {certificate.eventName}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-muted)]">
                        <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-[10px]">{formatDate(certificate.eventDate)}</span>
                        <span className="font-mono text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100/50 text-[10px] tracking-wide font-bold">
                          {certificate.verificationCode}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <motion.div whileTap={cardTap}>
                        <Link href={`/verify?code=${encodeURIComponent(certificate.verificationCode)}`} className="bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 shadow-sm inline-flex items-center gap-1.5 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Verify Link
                        </Link>
                      </motion.div>
                      
                      {certificate.linkedInAddUrl && (
                        <LinkedInShareButton linkedInAddUrl={certificate.linkedInAddUrl} />
                      )}

                      {certificate.pdfUrl ? (
                        <motion.a
                          href={`${BACKEND_URL}${certificate.pdfUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileTap={cardTap}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm inline-flex items-center gap-1.5 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          PDF
                        </motion.a>
                      ) : (
                        <span className="px-4 py-2.5 rounded-xl text-xs font-medium bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed">
                          Generating PDF
                        </span>
                      )}
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            )}
          </section>
        </div>
      </motion.main>

      {/* Profile Customize Modal */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Customize Recipient Portfolio</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Define your personal brand and social sharing presence.</p>
                </div>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="p-8 space-y-5">
                {saveError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl text-xs font-semibold leading-relaxed">
                    {saveError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[var(--color-primary)] focus:bg-white px-4 py-3 rounded-xl outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Headline / Title</label>
                    <input
                      type="text"
                      value={editPortfolioTitle}
                      onChange={(e) => setEditPortfolioTitle(e.target.value)}
                      placeholder="Software Engineer at Acme"
                      className="w-full text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[var(--color-primary)] focus:bg-white px-4 py-3 rounded-xl outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Profile Photo URL</label>
                  <input
                    type="url"
                    value={editPhoto}
                    onChange={(e) => setEditPhoto(e.target.value)}
                    placeholder="https://images.unsplash.com/... or your website URL"
                    className="w-full text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[var(--color-primary)] focus:bg-white px-4 py-3 rounded-xl outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Professional Bio</label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Brief summary of your professional background, certifications, and skills..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[var(--color-primary)] focus:bg-white px-4 py-3 rounded-xl outline-none transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">LinkedIn Profile URL</label>
                    <input
                      type="url"
                      value={editLinkedIn}
                      onChange={(e) => setEditLinkedIn(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[var(--color-primary)] focus:bg-white px-4 py-3 rounded-xl outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Twitter / X Handle</label>
                    <input
                      type="text"
                      value={editTwitter}
                      onChange={(e) => setEditTwitter(e.target.value)}
                      placeholder="@username"
                      className="w-full text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[var(--color-primary)] focus:bg-white px-4 py-3 rounded-xl outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsPublic}
                      onChange={(e) => setEditIsPublic(e.target.checked)}
                      className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-slate-300 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800">Make Portfolio Publicly Accessible</span>
                      <p className="text-[10px] text-slate-400">Allows anyone with your email address to view your certifications.</p>
                    </div>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-3 px-5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    disabled={isSaving}
                    whileTap={{ scale: 0.98 }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-3 px-6 rounded-xl shadow-sm shadow-indigo-500/10 flex items-center gap-1.5 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  >
                    {isSaving && (
                      <svg className="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    Save Changes
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
