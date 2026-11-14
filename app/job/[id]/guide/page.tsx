import Guide from "@/components/ar/Guide";
export default function GuidePage({ params }: { params: { id: string } }) {
  return <Guide caseId={params.id} />;
}
