import CreateEventPage from "@/components/CreateEventPage";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return <CreateEventPage initialTemplate={resolvedSearchParams.template} />;
}
