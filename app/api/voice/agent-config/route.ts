// OWNER: Sunny (AI). GET the ElevenLabs agent config (prompt + tools) with our public URL filled in.
import { NextResponse } from "next/server";
import { elevenLabsAgentConfig } from "@/lib/agents/elevenlabsConfig";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  return NextResponse.json(elevenLabsAgentConfig(base));
}
