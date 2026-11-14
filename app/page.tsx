// OWNER: Pitch presentation. Homepage integration for Andy review; original directory preserved at /demo.
import type { Metadata } from "next";
import Pitch from "@/components/pitch/Pitch";
export const metadata: Metadata = {
  title: "Boomer — A second set of eyes. A guide in your ear.",
  description:
    "Hands-free electrical guidance grounded in camera evidence, job context and local sources. Keep the work record, then turn consented footage into reviewed lessons.",
};
export default function Home() {
  return <Pitch />;
}
