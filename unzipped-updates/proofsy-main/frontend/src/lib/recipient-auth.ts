export const RECIPIENT_EMAIL_KEY = "proofsy_recipient_email";

export function saveRecipientEmail(email: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECIPIENT_EMAIL_KEY, email.toLowerCase());
}

export function loadRecipientEmail() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(RECIPIENT_EMAIL_KEY) || "";
}

export function clearRecipientEmail() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RECIPIENT_EMAIL_KEY);
}
