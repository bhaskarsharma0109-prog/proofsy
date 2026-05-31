/* eslint-disable @typescript-eslint/no-explicit-any */
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

    const workspaceId = typeof window !== "undefined" ? localStorage.getItem("proofsy_workspace_id") : null;
    if (workspaceId) {
      headers["x-workspace-id"] = workspaceId;
    }

    if (typeof window !== "undefined") {
      const recipientToken = localStorage.getItem("proofsy_recipient_token");
      const adminToken = localStorage.getItem("proofsy_admin_token");
      if (path.includes("/recipient") || path.includes("/auth/recipient")) {
        if (recipientToken) {
          headers["Authorization"] = `Bearer ${recipientToken}`;
        }
      } else if (adminToken) {
        headers["Authorization"] = `Bearer ${adminToken}`;
      }
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

export type CertificateStatus = "pending" | "generated" | "failed" | "revoked" | "expired" | "suspended";

export interface BrandingData {
  workspaceId?: string | null;
  workspaceName?: string;
  logo: string;
  primaryColor: string;
  accentColor: string;
  customDomain: string;
  brandingEnabled: boolean;
  verificationPageTitle: string;
  footerText: string;
}

export interface EventDetailData extends EventData {
  certificates: Array<{
    id: string;
    recipientName: string;
    recipientEmail: string;
    verificationCode: string;
    status: CertificateStatus;
    pdfUrl: string | null;
    expiresAt?: string | null;
    revokedAt?: string | null;
    revocationReason?: string;
    suspendedAt?: string | null;
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
  pngUrl?: string | null;
  svgUrl?: string | null;
  status: CertificateStatus;
  expiresAt?: string | null;
  revokedAt?: string | null;
  revocationReason?: string;
  suspendedAt?: string | null;
  renewedFrom?: string | null;
  issuedAt: string;
}

export interface CertificateDetailData extends CertificateData {
  organizerName: string;
  verificationUrl?: string;
}

export interface RecipientPortalData {
  user: {
    name: string;
    email: string;
    bio?: string;
    profilePhoto?: string;
    linkedinUrl?: string;
    twitterHandle?: string;
    portfolioTitle?: string;
    isPublicProfile?: boolean;
  };
  totalEventsAttended: number;
  certificates: Array<{
    id: string;
    eventId: string;
    eventName: string;
    eventDate: string | null;
    verificationCode: string;
    pdfUrl: string | null;
    issuedAt: string;
    linkedInAddUrl?: string;
  }>;
}

export interface StatsData {
  totalCertificates: number;
  generated: number;
  pending: number;
  failed: number;
  revoked?: number;
  expired?: number;
  suspended?: number;
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

export interface VerificationAnalyticsData {
  totalVerifications: number;
  referrals: {
    linkedin: number;
    twitter: number;
    qr: number;
    direct: number;
    offline: number;
  };
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  osBreakdown: Array<{ name: string; count: number }>;
  timeline: Array<{
    date: string;
    label: string;
    count: number;
  }>;
  recentAudits: Array<{
    id: string;
    verificationCode: string;
    recipientName: string;
    eventName: string;
    referralSource: "linkedin" | "twitter" | "qr" | "direct" | "offline";
    browser: string;
    os: string;
    deviceType: string;
    timestamp: string;
  }>;
}

export interface UserLookupData {
  id: string;
  name: string;
  email: string;
  totalCertificates: number;
  totalEventsAttended: number;
}

export interface CustomFontData {
  id: string;
  name: string;
  family: string;
  fontWeight: "normal" | "bold";
  fontUrl: string;
  createdAt: string;
}

export interface AuditLogData {
  id: string;
  actorName: string;
  actorEmail: string;
  action: string;
  targetId: string | null;
  targetModel: string | null;
  description: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
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

  getVerificationAnalytics: () =>
    request<VerificationAnalyticsData>("/certificates/verification-analytics"),

  retryCertificate: (id: string) =>
    request<{ success: boolean; message?: string }>(`/certificates/${encodeURIComponent(id)}/retry`, {
      method: "POST",
    }),

  revokeCertificate: (id: string, reason: string) =>
    request<CertificateData>(`/certificates/${encodeURIComponent(id)}/revoke`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  bulkRevokeCertificates: (ids: string[], reason: string) =>
    request<{ updated: number; ids: string[] }>("/certificates/bulk-revoke", {
      method: "POST",
      body: JSON.stringify({ ids, reason }),
    }),

  suspendCertificate: (id: string) =>
    request<CertificateData>(`/certificates/${encodeURIComponent(id)}/suspend`, {
      method: "POST",
    }),

  reinstateCertificate: (id: string) =>
    request<CertificateData>(`/certificates/${encodeURIComponent(id)}/reinstate`, {
      method: "POST",
    }),

  renewCertificate: (id: string, expiresAt?: string | null) =>
    request<CertificateData>(`/certificates/${encodeURIComponent(id)}/renew`, {
      method: "POST",
      body: JSON.stringify({ expiresAt }),
    }),

  updateCertificateExpiry: (id: string, expiresAt: string | null) =>
    request<CertificateData>(`/certificates/${encodeURIComponent(id)}/expiry`, {
      method: "PUT",
      body: JSON.stringify({ expiresAt }),
    }),

  getExpiringCertificates: (days = 30) =>
    request<CertificateData[]>(`/certificates/expiring?days=${encodeURIComponent(String(days))}`),

  // Integrations
  getIntegrations: () => request<Record<string, unknown>>("/integrations"),
  updateZapierIntegration: (connected: boolean, webhookUrl?: string) =>
    request<Record<string, unknown>>("/integrations/zapier", {
      method: "PUT",
      body: JSON.stringify({ connected, webhookUrl }),
    }),
  updateGoogleSheetsIntegration: (connected: boolean, sheetUrl?: string) =>
    request<Record<string, unknown>>("/integrations/google-sheets", {
      method: "PUT",
      body: JSON.stringify({ connected, sheetUrl }),
    }),
  updateRestApiIntegration: (connected: boolean, regenerate?: boolean) =>
    request<Record<string, unknown>>("/integrations/rest-api", {
      method: "PUT",
      body: JSON.stringify({ connected, regenerate }),
    }),
  updateSlackIntegration: (connected: boolean, webhookUrl?: string) =>
    request<Record<string, unknown>>("/integrations/slack", {
      method: "PUT",
      body: JSON.stringify({ connected, webhookUrl }),
    }),
  getGoogleSheetsPreview: (eventId: string) =>
    request<{
      sheetUrl: string;
      totalCount: number;
      recipients: Array<{ name: string; email: string }>;
    }>(`/events/${encodeURIComponent(eventId)}/google-sheets/preview`),
  importGoogleSheets: (eventId: string) =>
    request<{
      success: boolean;
      message: string;
      data: { jobId: string; totalRowsProcessed: number };
    }>(`/events/${encodeURIComponent(eventId)}/google-sheets/import`, {
      method: "POST",
    }),

  // Users
  listUsers: () =>
    request<UserLookupData[]>("/users"),

  getUserByEmail: (email: string) =>
    request<UserLookupData>(`/users/${encodeURIComponent(email)}`),

  getUserCertificates: () =>
    request<RecipientPortalData>(`/auth/recipient/certificates`),

  // Verify
  verifyCertificate: (code: string) =>
    request<{
      isValid: boolean;
      reason?: string;
      branding?: BrandingData;
      certificate: {
        recipientName: string;
        recipientEmail?: string;
        eventName: string;
        eventDate: string | null;
        organizerName?: string;
        issuedAt: string;
        expiresAt?: string | null;
        revokedAt?: string | null;
        revocationReason?: string;
        suspendedAt?: string | null;
        status?: CertificateStatus;
        pdfUrl: string | null;
        pngUrl?: string | null;
        svgUrl?: string | null;
        cryptographicSignature: string | null;
        isCryptographicallyVerified: boolean;
      };
    }>(`/verify/${encodeURIComponent(code)}`),

  getPublicKey: () =>
    request<{
      publicKey: string;
    }>("/verify/public-key"),

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
  demoLogin: () => request<any>("/auth/demo", { method: "POST" }),
  logout: () => request<any>("/auth/logout", { method: "POST" }),
  me: () => request<any>("/auth/me"),
  
  // Recipient Auth
  recipientRegister: (body: { name: string; email: string }) => request<any>("/auth/recipient/register", { method: "POST", body: JSON.stringify(body) }),
  requestRecipientOTP: (email: string) => request<any>("/auth/recipient/login", { method: "POST", body: JSON.stringify({ email }) }),
  verifyRecipientOTP: (email: string, otp: string) => request<any>("/auth/recipient/verify", { method: "POST", body: JSON.stringify({ email, otp }) }),
  recipientMe: () => request<any>("/auth/recipient/me"),
  recipientLogout: () => request<any>("/auth/recipient/logout", { method: "POST" }),
  updateRecipientProfile: (body: {
    name?: string;
    bio?: string;
    profilePhoto?: string;
    linkedinUrl?: string;
    twitterHandle?: string;
    portfolioTitle?: string;
    isPublicProfile?: boolean;
  }) => request<any>("/auth/recipient/profile", { method: "PUT", body: JSON.stringify(body) }),
  getPublicRecipientProfile: (email: string) => request<RecipientPortalData>(`/auth/recipient/public/${encodeURIComponent(email)}`),

  // Workspaces
  listWorkspaces: () => request<any>("/workspaces"),
  createWorkspace: (name: string, slug?: string) => request<any>("/workspaces", { method: "POST", body: JSON.stringify({ name, slug }) }),
  inviteWorkspaceMember: (workspaceId: string, data: any) => request<any>(`/workspaces/${workspaceId}/invite`, { method: "POST", body: JSON.stringify(data) }),
  updateWorkspaceSmtp: (workspaceId: string, data: any) => request<any>(`/workspaces/${workspaceId}/smtp`, { method: "PUT", body: JSON.stringify(data) }),
  listWorkspaceMembers: (workspaceId: string) => request<any>(`/workspaces/${workspaceId}/members`),
  getBranding: (workspaceId: string) =>
    request<{ workspaceId: string; workspaceName: string; branding: BrandingData }>(`/branding/${encodeURIComponent(workspaceId)}`),
  updateBranding: (body: Partial<BrandingData>) =>
    request<{ workspaceId: string; workspaceName: string; branding: BrandingData }>("/branding", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  uploadBrandingLogo: (file: File) => {
    const formData = new FormData();
    formData.append("logo", file);
    return request<{ logo: string; branding: BrandingData }>("/branding/logo", {
      method: "POST",
      body: formData,
    });
  },
  initiatePayment: (plan: string) => request<any>("/billing/pay", { method: "POST", body: JSON.stringify({ plan }) }),
  getTransactionStatus: (txnId: string, mock?: boolean) => request<any>(`/billing/status/${txnId}?mock=${mock ? "true" : "false"}`),

  // Custom Fonts
  getCustomFonts: () => request<CustomFontData[]>("/custom-fonts"),
  uploadCustomFont: (formData: FormData) =>
    request<CustomFontData>("/custom-fonts", {
      method: "POST",
      body: formData,
    }),
  deleteCustomFont: (id: string) =>
    request<{ success: boolean; message?: string }>(`/custom-fonts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  // Audit Logs
  getAuditLogs: (filters?: { action?: string; actorEmail?: string; search?: string }) => {
    let query = "";
    if (filters) {
      const params = new URLSearchParams();
      if (filters.action) params.append("action", filters.action);
      if (filters.actorEmail) params.append("actorEmail", filters.actorEmail);
      if (filters.search) params.append("search", filters.search);
      query = `?${params.toString()}`;
    }
    return request<{
      success: boolean;
      pagination: { total: number; limit: number; offset: number };
      data: AuditLogData[];
    }>(`/audit-logs${query}`);
  },
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
