import type { Metadata } from "next";
import PublicRecipientPortalClient from "@/components/PublicRecipientPortalClient";

function getApiBase() {
  const explicitApi = process.env.NEXT_PUBLIC_API_URL;
  if (explicitApi && explicitApi.startsWith("http")) {
    return explicitApi.replace(/\/$/, "");
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (backendUrl) {
    return `${backendUrl.replace(/\/$/, "")}/api`;
  }

  return "http://localhost:5000/api";
}

async function fetchPublicProfile(email: string) {
  try {
    const response = await fetch(`${getApiBase()}/auth/recipient/public/${encodeURIComponent(email)}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const json = await response.json();
    return json?.data || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ email: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const email = decodeURIComponent(resolvedParams.email || "");
  const profile = await fetchPublicProfile(email);
  const user = profile?.user;

  if (!user) {
    return {
      title: "Recipient Portfolio - Proofsy",
      description: "View verified credentials and certificates on Proofsy.",
    };
  }

  const title = user.portfolioTitle
    ? `${user.name} | ${user.portfolioTitle}`
    : `${user.name}'s Verified Certifications`;
  const description = user.bio || `View verified credentials and achievements earned by ${user.name} via Proofsy.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      images: user.profilePhoto ? [{ url: user.profilePhoto }] : undefined,
    },
    twitter: {
      card: user.profilePhoto ? "summary_large_image" : "summary",
      title,
      description,
      images: user.profilePhoto ? [user.profilePhoto] : undefined,
    },
  };
}

export default function PublicRecipientPortalPage() {
  return <PublicRecipientPortalClient />;
}
