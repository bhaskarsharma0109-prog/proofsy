"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api, RecipientPortalData, BACKEND_URL } from "@/lib/api";
import { fadeUp, pulseGlow, cardHover, cardTap, pageVariants, staggerContainer } from "@/lib/animations";
import LinkedInShareButton from "@/components/LinkedInShareButton";

export default function PublicRecipientPortalPage() {
  const params = useParams();
  const [data, setData] = useState<RecipientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const email = decodeURIComponent(
    Array.isArray(params.email) ? params.email[0] : params.email || ""
  );

  useEffect(() => {
    async function loadPublicProfile() {
      if (!email) {
        setError("No recipient email specified.");
        setLoading(false);
        return;
      }

      const res = await api.getPublicRecipientProfile(email);

      if (!res.success || !res.data) {
        setError(res.error || "This profile is private or does not exist.");
        setLoading(false);
        return;
      }

      setData(res.data);
      setLoading(false);

      // Set document metadata dynamically for social sharing
      if (res.data.user) {
        const u = res.data.user;
        document.title = u.portfolioTitle 
          ? `${u.name} | ${u.portfolioTitle} - Proofsy Portfolio`
          : `${u.name} - Certifications Portfolio`;

        // Dynamically insert/update OpenGraph and Twitter tags
        const updateMeta = (property: string, content: string, isNameAttr = false) => {
          const selector = isNameAttr ? `meta[name="${property}"]` : `meta[property="${property}"]`;
          let el = document.querySelector(selector);
          if (!el) {
            el = document.createElement("meta");
            if (isNameAttr) {
              el.setAttribute("name", property);
            } else {
              el.setAttribute("property", property);
            }
            document.head.appendChild(el);
          }
          el.setAttribute("content", content);
        };

        updateMeta("og:title", `${u.name}'s Professional Certifications`);
        updateMeta("og:description", u.bio || `View verified credentials and achievements earned by ${u.name} via Proofsy.`);
        if (u.profilePhoto) updateMeta("og:image", u.profilePhoto);
        updateMeta("og:type", "profile");
        updateMeta("twitter:card", "summary_large_image", true);
        updateMeta("twitter:title", `${u.name}'s Verified Certifications`, true);
        updateMeta("twitter:description", u.bio || `Verified credentials portfolio for ${u.name}.`, true);
      }
    }

    loadPublicProfile();
  }, [email]);

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
        Loading public portfolio...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center px-6">
        <div className="bg-white rounded-3xl border border-[var(--color-border)] p-8 max-w-md text-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[var(--color-foreground)]">Profile is private</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
            {error || "This recipient's certifications portfolio has been set to private by the owner."}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              Go to Proofsy
            </Link>
            <Link href="/verify" className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              Verify Certificate Code
            </Link>
          </div>
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
    <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden">
      <motion.div variants={pulseGlow} animate="animate" className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-200/10 rounded-full blur-3xl pointer-events-none" />
      <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: "1.5s" }} className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-200/10 rounded-full blur-3xl pointer-events-none" />

      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/80 backdrop-blur-md relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-indigo-50 border border-indigo-100">
              <Image src="/logo.svg" alt="Proofsy" width={24} height={24} className="object-contain" />
            </div>
            <div>
              <p className="text-base font-bold text-[var(--color-foreground)] leading-none">Proofsy</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-1 font-medium">Verified Credentials</p>
            </div>
          </Link>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Public Portfolio
          </span>
        </div>
      </header>

      <motion.main variants={pageVariants} initial="hidden" animate="visible" className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Profile Card Section */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white rounded-3xl border border-[var(--color-border)] p-8 shadow-sm text-center">
            
            {/* Profile Photo */}
            <div className="flex justify-center">
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

            <h1 className="mt-5 text-xl font-bold text-[var(--color-foreground)] leading-tight">
              {data.user.name}
            </h1>
            
            {data.user.portfolioTitle && (
              <p className="mt-3 text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider bg-indigo-50/50 inline-block px-3 py-1 rounded-full border border-indigo-100/50">
                {data.user.portfolioTitle}
              </p>
            )}

            <p className="mt-4 text-sm text-[var(--color-muted)] leading-relaxed italic px-2">
              {data.user.bio || "This recipient hasn't added a bio yet. They have successfully earned verified credentials below."}
            </p>

            {/* Social Links */}
            {(data.user.linkedinUrl || data.user.twitterHandle) && (
              <div className="mt-6 flex items-center justify-center gap-3 pt-6 border-t border-slate-100">
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
            )}
          </section>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Events</p>
              <p className="mt-2 text-3xl font-extrabold text-[var(--color-foreground)] leading-none">{data.totalEventsAttended}</p>
            </div>
            <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Verified Credentials</p>
              <p className="mt-2 text-3xl font-extrabold text-[var(--color-foreground)] leading-none">{data.certificates.length}</p>
            </div>
          </div>
        </div>

        {/* Certificates Grid Section */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-3xl border border-[var(--color-border)] shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-[var(--color-border)] flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/50 backdrop-blur-sm sticky top-[73px] z-10">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--color-foreground)]">Verified Credentials</h2>
                <p className="text-xs text-[var(--color-muted)] mt-1 font-medium">Proofsy guaranteed authentic academic and professional certifications.</p>
              </div>
              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Search credentials..."
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
                  {searchQuery ? "Try searching for a different event name or verification code." : "This recipient portfolio is currently empty."}
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

      <footer className="border-t border-slate-200/50 py-8 text-center relative z-10 bg-white">
        <p className="text-[11px] text-[var(--color-muted)] font-medium">Powered by Proofsy. Cryptographically verified certificate authenticity guaranteed.</p>
      </footer>
    </div>
  );
}
