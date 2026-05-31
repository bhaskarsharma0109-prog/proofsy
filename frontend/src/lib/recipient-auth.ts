export const RECIPIENT_EMAIL_KEY = "proofsy_recipient_email";
export const RECIPIENT_TOKEN_KEY = "proofsy_recipient_token";

export function saveRecipientEmail(email: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECIPIENT_EMAIL_KEY, email.toLowerCase());
}

export function saveRecipientToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECIPIENT_TOKEN_KEY, token);
}

export function loadRecipientToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(RECIPIENT_TOKEN_KEY) || "";
}

export function loadRecipientEmail() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(RECIPIENT_EMAIL_KEY) || "";
}

export function clearRecipientEmail() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RECIPIENT_EMAIL_KEY);
  window.localStorage.removeItem(RECIPIENT_TOKEN_KEY);
}
