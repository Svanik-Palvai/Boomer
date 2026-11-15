// OWNER: Lessons feature. Browser auth uses only public configuration, loaded on demand.
import type { SupabaseClient } from "@supabase/supabase-js";
let loading: Promise<SupabaseClient> | undefined;
export function lessonClient(): Promise<SupabaseClient> {
  if (!loading)
    loading = (async () => {
      const r = await fetch("/api/lessons/config", { cache: "no-store" });
      const c = await r.json();
      if (!r.ok || !c.configured)
        throw new Error(
          "Lessons need the dedicated Boomer Supabase configuration. Live recording is disabled until setup.",
        );
      const { createClient } = await import("@supabase/supabase-js");
      return createClient(c.url, c.anonKey);
    })().catch((e) => {
      loading = undefined;
      throw e;
    });
  return loading;
}
export async function lessonRequest(path: string, body?: unknown) {
  const c = await lessonClient();
  const { data } = await c.auth.getSession();
  if (!data.session) throw new Error("Sign in at the lesson workspace first.");
  const r = await fetch(`/api/lessons/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const result = await r
    .json()
    .catch(() => ({ error: "Lesson service returned an unreadable response" }));
  if (!r.ok) throw new Error(result.error || "Lesson request failed");
  return result;
}
