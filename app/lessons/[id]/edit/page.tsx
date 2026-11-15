// OWNER: Lessons feature.
import Editor from "@/components/lessons/Editor";
export default function Page({ params }: { params: { id: string } }) {
  return <Editor id={params.id} />;
}
