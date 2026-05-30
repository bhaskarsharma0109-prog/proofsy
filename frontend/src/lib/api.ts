export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Timeout wrapper for fetch
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      credentials: "include",
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const isFormData = options?.body instanceof FormData;
    const headers: Record<string, string> = { ...(options?.headers as Record<string, string>) };
    
    // Only set application/json if it's NOT FormData
    if (!isFormData && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetchWithTimeout(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
    
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error || `HTTP ${res.status}` };
    }
    return json;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return { success: false, error: "Request timed out" };
    }
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

// Events
export interface EventData {
  id: string;
  name: string;
  date: string;
  organizerName: string;
  createdAt: string;
  templateId?: string;
  duration?: string;
}

export interface EventDetailData extends EventData {
  certificates: Array<{
    id: string;
    recipientName: string;
    recipientEmail: string;
    verificationCode: string;
    status: "pending" | "generated" | "failed";
    pdfUrl: string | null;
    issuedAt: string;
  }>;
}

export interface CertificateData {
  id: string;
  verificationCode: string;
  recipientName: string;
  recipientEmail: string;
  eventName: string;
  eventDate: string | null;
  templateId: string;
  pdfUrl: string | null;
  status: "pending" | "generated" | "failed";
  issuedAt: string;
}

export interface CertificateDetailData extends CertificateData {
  organizerName: string;
  verificationUrl?: string;
}

export interface RecipientPortalData {
  user: { name: string; email: string };
  totalEventsAttended: number;
  certificates: Array<{
    id: string;
    eventId: string;
    eventName: string;
    eventDate: string | null;
    verificationCode: string;
    pdfUrl: string | null;
    issuedAt: string;
  }>;
}

export interface StatsData {
  totalCertificates: number;
  generated: number;
  pending: number;
  failed: number;
  totalEvents: number;
  totalUsers: number;
  verificationRate: number;
  recentEvents: Array<{
    id: string;
    name: string;
    date: string;
    organizerName: string;
    totalCertificates: number;
    generatedCertificates: number;
    createdAt: string;
  }>;
  topRecipients: Array<{
    name: string;
    email: string;
    certificateCount: number;
  }>;
}

export interface UserLookupData {
  id: string;
  name: string;
  email: string;
  totalCertificates: number;
  totalEventsAttended: number;
}

export const api = {
  // Events
  createEvent: (body: { name: string; date: string; organizerName: string; templateId?: string; duration?: string }) =>
    request<EventData>("/events", { method: "POST", body: JSON.stringify(body) }),

  listEvents: () => request<EventData[]>("/events"),

  getEvent: (id: string) =>
    request<EventDetailData>(`/events/${encodeURIComponent(id)}`),

  deleteEvent: (id: string) =>
    request<{ id: string; deletedCertificates: number }>(`/events/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  createUser: (body: { name: string; email: string }) =>
    request<{ id: string; name: string; email: string }>("/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Certificates
  generateCertificates: (eventId: string, file: File) => {
    const formData = new FormData();
    formData.append("eventId", eventId);
    formData.append("file", file);
    return request<{ success: boolean; message?: string }>("/certificates/generate", { 
      method: "POST", 
      body: formData 
    });
  },

  listCertificates: () =>
    request<CertificateData[]>("/certificates"),

  getCertificate: (id: string) =>
    request<CertificateDetailData>(`/certificates/${encodeURIComponent(id)}`),

  getStats: () =>
    request<StatsData>("/certificates/stats"),

  // Users
  listUsers: () =>
    request<UserLookupData[]>("/users"),

  getUserByEmail: (email: string) =>
    request<UserLookupData>(`/users/${encodeURIComponent(email)}`),

  getUserCertificates: (email: string) =>
    request<RecipientPortalData>(`/users/${encodeURIComponent(email)}/certificates`),

  // Verify
  verifyCertificate: (code: string) =>
    request<{
      isValid: boolean;
      certificate: {
        recipientName: string;
        eventName: string;
        eventDate: string | null;
        issuedAt: string;
        pdfUrl: string | null;
      };
    }>(`/verify/${encodeURIComponent(code)}`),

  // Send Emails
  sendEmails: (eventId: string) =>
    request<{ sent: number; failed: number }>("/certificates/send-emails", {
      method: "POST",
      body: JSON.stringify({ eventId }),
    }),

  // Templates
  createTemplate: (formData: FormData) =>
    request<TemplateData>("/templates", { method: "POST", body: formData }),

  listTemplates: () =>
    request<TemplateListItem[]>("/templates"),

  getTemplate: (id: string) =>
    request<TemplateData>(`/templates/${encodeURIComponent(id)}`),

  updateTemplate: (id: string, body: Partial<TemplateData>) =>
    request<TemplateData>(`/templates/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteTemplate: (id: string) =>
    request<{ id: string }>(`/templates/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  seedTemplates: () =>
    request<{ message: string }>("/templates/seed", { method: "POST" }),

  // Health
  health: () => request<{ status: string; timestamp: string }>("/health"),

  // Auth
  register: (body: any) => request<any>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: any) => request<any>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request<any>("/auth/logout", { method: "POST" }),
  me: () => request<any>("/auth/me"),
};

// Template types
export interface TextLayer {
  _id?: string;
  variable: "recipient_name" | "event_name" | "date" | "verification_code" | "organizer" | "duration" | "custom";
  label: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: "normal" | "bold";
  color: string;
  textAlign: "left" | "center" | "right";
  maxWidth: number | null;
  customText?: string | null;
}

export interface QrCodeConfig {
  enabled: boolean;
  x: number;
  y: number;
  size: number;
}

export interface TemplateData {
  _id: string;
  name: string;
  backgroundType: "image" | "pdf";
  backgroundUrl: string;
  width: number;
  height: number;
  textLayers: TextLayer[];
  qrCode: QrCodeConfig;
  isStarter: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateListItem {
  id: string;
  name: string;
  backgroundType: "image" | "pdf";
  backgroundUrl: string;
  width: number;
  height: number;
  textLayerCount: number;
  isStarter: boolean;
  qrCode: QrCodeConfig;
  createdAt: string;
}
