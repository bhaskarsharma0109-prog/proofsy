"use client";

export type OnboardingAction =
  | "viewedTemplates"
  | "selectedTemplate"
  | "createdEvent"
  | "issuedCredentials"
  | "viewedAnalytics";

const STORAGE_KEY = "proofsy:onboarding";
const UPDATE_EVENT = "proofsy:onboarding-updated";

export type OnboardingState = Record<OnboardingAction, boolean>;

export const onboardingSteps: Array<{
  id: OnboardingAction;
  label: string;
  href: string;
}> = [
  { id: "viewedTemplates", label: "Browse templates", href: "/templates" },
  { id: "selectedTemplate", label: "Choose a design", href: "/templates" },
  { id: "createdEvent", label: "Create an event", href: "/events/new" },
  { id: "issuedCredentials", label: "Issue credentials", href: "/events/new" },
  { id: "viewedAnalytics", label: "Review analytics", href: "/analytics" },
];

export const emptyOnboardingState: OnboardingState = {
  viewedTemplates: false,
  selectedTemplate: false,
  createdEvent: false,
  issuedCredentials: false,
  viewedAnalytics: false,
};

export function readOnboardingState(): OnboardingState {
  if (typeof window === "undefined") {
    return emptyOnboardingState;
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return { ...emptyOnboardingState, ...(saved ? JSON.parse(saved) : {}) };
  } catch {
    return emptyOnboardingState;
  }
}

export function trackOnboarding(action: OnboardingAction) {
  if (typeof window === "undefined") return;

  const next = { ...readOnboardingState(), [action]: true };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: next }));
}

export function subscribeToOnboarding(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(UPDATE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(UPDATE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
