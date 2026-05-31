"use client";

export type OnboardingAction =
  | "createdEvent"
  | "addedRecipients"
  | "issuedCredentials"
  | "verifiedCertificate";

const STORAGE_KEY = "proofsy:onboarding";
const UPDATE_EVENT = "proofsy:onboarding-updated";

export type OnboardingState = Record<OnboardingAction, boolean>;

export const onboardingSteps: Array<{
  id: OnboardingAction;
  label: string;
  href: string;
}> = [
  { id: "createdEvent", label: "Create event", href: "/events/new" },
  { id: "addedRecipients", label: "Add recipients", href: "/events" },
  { id: "issuedCredentials", label: "Generate certificates", href: "/events" },
  { id: "verifiedCertificate", label: "Verify certificate", href: "/verify" },
];

export const emptyOnboardingState: OnboardingState = {
  createdEvent: false,
  addedRecipients: false,
  issuedCredentials: false,
  verifiedCertificate: false,
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
