// OWNER: Sunny (AI). Open http://localhost:3000/api/ai/test-parse to run the test replies.
// Runs ONE AT A TIME with a gap, because the free Gemini tier only allows a few requests per minute.
// Options: ?n=5 runs only the first 5 replies, ?gap=6000 waits 6s between calls.
import { NextResponse } from "next/server";
import { parseReplyDetailed } from "@/lib/ai/parseReply";
import { PARSE_CASES } from "@/lib/ai/parseReply.cases";
import { demoCase } from "@/lib/mock/demoCase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const n = Number(q.get("n") ?? PARSE_CASES.length);
  const gap = Number(q.get("gap") ?? 4000);
  const c = demoCase();
  const started = Date.now();
  const results = [];
  for (const [i, t] of PARSE_CASES.slice(0, n).entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, gap));
    const { actions, source, error } = await parseReplyDetailed(t.text, c, t.stage);
    const got = actions.map((a) => a.type);
    const pass = t.expect.every((e) => got.includes(e)) && !(t.forbid ?? []).some((f) => got.includes(f));
    results.push({ pass, source, stage: t.stage, text: t.text, got: actions, expected: t.expect, forbidden: t.forbid ?? [], error });
  }
  return NextResponse.json({
    model: process.env.GEMINI_MODEL ?? "(default)",
    score: `${results.filter((r) => r.pass).length}/${results.length}`,
    geminiAnswered: `${results.filter((r) => r.source === "gemini").length}/${results.length}`,
    firstError: results.find((r) => r.error)?.error ?? null,
    seconds: (Date.now() - started) / 1000,
    results,
  });
}
