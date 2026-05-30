import VerificationPage from "@/components/VerificationPage";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return <VerificationPage initialCode={resolvedSearchParams.code?.toUpperCase() || ""} />;
}
