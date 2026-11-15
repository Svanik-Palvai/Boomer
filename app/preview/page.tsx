// The redesign moved to the homepage; keep old /preview links working.
import { redirect } from "next/navigation";

export default function PreviewPage() {
  redirect("/");
}
