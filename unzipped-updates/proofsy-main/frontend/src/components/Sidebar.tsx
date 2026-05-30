"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, StatsData } from "@/lib/api";
import {
  onboardingSteps,
  readOnboardingState,
  subscribeToOnboarding,
  trackOnboarding,
} from "@/lib/onboarding";

const navSections = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Issue & Track",
    items: [
      {
        label: "Credentials",
        href: "#credentials",
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        ),
        expandable: true,
        children: [
          { label: "Credential Templates", href: "/credential-templates" },
          { label: "All Credentials", href: "/certificates" },
        ],
      },
      {
        label: "Pathways",
        href: "/pathways",
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
          </svg>
        ),
      },
      {
        label: "Analytics",
        href: "/analytics",
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Graphic Assets",
    items: [
      {
        label: "Design Templates",
        href: "/templates",
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
          </svg>
        ),
      },
      {
        label: "Email Templates",
        href: "/email-templates",
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Workflows",
    items: [
      {
        label: "Integrations",
        href: "/integrations",
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
          </svg>
        ),
      },
      {
        label: "Automations",
        href: "/automations",
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [credentialsOpen, setCredentialsOpen] = useState(
    pathname.startsWith("/certificates") || pathname.startsWith("/credential-templates")
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [gettingStartedOpen, setGettingStartedOpen] = useState(true);
  const [onboarding, setOnboarding] = useState(readOnboardingState);
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    return subscribeToOnboarding(() => setOnboarding(readOnboardingState()));
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/templates") || pathname.startsWith("/credential-templates")) {
      trackOnboarding("viewedTemplates");
    }

    if (pathname.startsWith("/analytics")) {
      trackOnboarding("viewedAnalytics");
    }
  }, [pathname]);

  useEffect(() => {
    let active = true;

    async function loadStats() {
      const res = await api.getStats();
      if (active && res.success && res.data) {
        setStats(res.data);
      }
    }

    loadStats();
    const timer = window.setInterval(loadStats, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const completed = useMemo(() => {
    const current = { ...onboarding };

    if ((stats?.totalEvents || 0) > 0) {
      current.createdEvent = true;
    }

    if ((stats?.totalCertificates || 0) > 0) {
      current.issuedCredentials = true;
    }

    return current;
  }, [onboarding, stats]);

  const completedCount = onboardingSteps.filter((step) => completed[step.id]).length;
  const progress = Math.round((completedCount / onboardingSteps.length) * 100);
  const nextStep = onboardingSteps.find((step) => !completed[step.id]) || onboardingSteps[onboardingSteps.length - 1];
  const usageCount = stats?.totalCertificates || 0;
  const usageLimit = 250;
  const usageProgress = Math.min(100, Math.round((usageCount / usageLimit) * 100));

  return (
    <>
      <aside className="w-[260px] bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col min-h-screen shrink-0">
        {/* Brand */}
        <div className="px-4 py-4 border-b border-[var(--color-border)]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
              <Image src="/logo.svg" alt="Proofsy" width={36} height={36} className="object-contain" />
            </div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-[17px] font-bold text-[var(--color-foreground)] leading-none">Proofsy</h1>
              <svg className="w-3.5 h-3.5 text-[var(--color-muted)] opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Quick Search */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-muted)] text-[13px] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)] cursor-pointer group"
          >
            <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <span className="flex-1 text-left">Quick Search</span>
            <kbd className="text-[10px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[var(--color-muted)] group-hover:border-[var(--color-border-strong)]">⌘K</kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-3 overflow-y-auto">
          {navSections.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-4" : ""}>
              {section.title && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isExpandable = 'expandable' in item && item.expandable;
                  const children = 'children' in item ? item.children : [];
                  const isActive = !isExpandable && pathname === item.href;
                  const isChildActive = isExpandable && children?.some((c: { href: string }) => pathname === c.href);

                  if (isExpandable) {
                    return (
                      <li key={item.label}>
                        <button
                          onClick={() => setCredentialsOpen(!credentialsOpen)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer
                            ${isChildActive
                              ? "text-[var(--color-primary)]"
                              : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-alt)]"
                            }`}
                        >
                          {item.icon}
                          <span className="flex-1 text-left">{item.label}</span>
                          <svg
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${credentialsOpen ? "rotate-0" : "-rotate-90"}`}
                            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>
                        {credentialsOpen && children && (
                          <ul className="ml-8 mt-0.5 space-y-0.5">
                            {children.map((child: { label: string; href: string }) => {
                              const childActive = pathname === child.href;
                              return (
                                <li key={child.href}>
                                  <Link
                                    href={child.href}
                                    className={`block px-3 py-1.5 rounded-md text-[13px] font-medium cursor-pointer
                                      ${childActive
                                        ? "text-[var(--color-primary)] bg-[var(--color-primary-faint)]"
                                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-alt)]"
                                      }`}
                                  >
                                    {child.label}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer
                          ${isActive
                            ? "bg-[var(--color-primary-faint)] text-[var(--color-primary)]"
                            : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-alt)]"
                          }`}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Getting Started + Footer */}
        <div className="border-t border-[var(--color-border)]">
          {/* Getting Started */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                </svg>
                <span className="text-[12px] font-semibold text-[var(--color-foreground)]">Getting Started</span>
              </div>
              <button
                type="button"
                onClick={() => setGettingStartedOpen((open) => !open)}
                className="flex items-center gap-1.5 cursor-pointer"
                aria-label={gettingStartedOpen ? "Hide getting started checklist" : "Show getting started checklist"}
              >
                <svg className="w-3.5 h-3.5 text-[var(--color-muted)] hover:text-[var(--color-foreground)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-[var(--color-muted)] mb-2">{progress}% completed</p>
            <div className="w-full h-1.5 bg-[var(--color-surface-alt)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            {gettingStartedOpen && (
              <div className="mt-3 space-y-1">
                {onboardingSteps.map((step) => {
                  const done = completed[step.id];

                  return (
                    <Link
                      key={step.id}
                      href={step.href}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium hover:bg-[var(--color-surface-alt)]"
                    >
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] ${done ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--color-border-strong)] text-[var(--color-muted)]"}`}>
                        {done ? "✓" : ""}
                      </span>
                      <span className={done ? "text-[var(--color-foreground)]" : "text-[var(--color-muted)]"}>{step.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Issue credentials CTA */}
          <div className="px-4 pb-2">
            <Link
              href={nextStep.href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)] cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              {nextStep.label}
              <span className="ml-auto bg-[var(--color-primary)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Next</span>
            </Link>
          </div>

          {/* Credential Usage */}
          <div className="px-4 py-2 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--color-muted)]">Credential Usage</span>
              <span className="text-[11px] font-semibold text-[var(--color-foreground)] tabular-nums">{usageCount} / {usageLimit}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-alt)]">
              <div className="h-full rounded-full bg-[var(--color-success)] transition-all duration-500" style={{ width: `${usageProgress}%` }} />
            </div>
          </div>

          {/* Upgrade */}
          <div className="px-4 pb-4 pt-1">
            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--color-border)] text-[13px] font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-surface-alt)] cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Upgrade
            </button>
          </div>
        </div>
      </aside>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)]">
              <svg className="w-5 h-5 text-[var(--color-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                autoFocus
                type="text"
                placeholder="Search credentials, templates, recipients..."
                className="flex-1 text-sm outline-none bg-transparent text-[var(--color-foreground)] placeholder:text-[var(--color-muted)]/50"
              />
              <kbd className="text-[10px] font-mono bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[var(--color-muted)]">ESC</kbd>
            </div>
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-[var(--color-muted)]">Start typing to search...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
