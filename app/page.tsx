// OWNER: Pitch presentation. Homepage integration for Andy review; original directory preserved at /demo.
import type { Metadata } from "next";
import Pitch from "@/components/pitch/Pitch";
export const metadata: Metadata = {
  title: "Boomer — Built for the people who build everything",
  description:
    "Local knowledge. Hands-free guidance. A work record that travels with you. Boomer starts with electricians working across state lines.",
};
export default function Home() {
  return <Pitch />;
}
