import VerificationPage from "@/components/VerificationPage";

export default async function VerifySlugCodePage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const resolvedParams = await params;

  return <VerificationPage initialCode={resolvedParams.code?.toUpperCase() || ""} />;
}
