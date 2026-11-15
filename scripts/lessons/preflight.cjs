// Check local prerequisites before claiming durable tasks. Never print credentials.
const { spawnSync } = require("node:child_process");
function preflight(env = process.env, execute = spawnSync) {
  const errors = [], warnings = [];
  for (const key of ["LESSON_SUPABASE_URL", "LESSON_SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_LESSON_SUPABASE_ANON_KEY"])
    if (!env[key]?.trim()) errors.push(`Missing ${key}`);
  if (env.LESSON_SUPABASE_URL) {
    try {
      const url = new URL(env.LESSON_SUPABASE_URL);
      if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
        errors.push("LESSON_SUPABASE_URL must use HTTPS outside localhost");
    } catch { errors.push("LESSON_SUPABASE_URL is invalid"); }
  }
  if (!env.LESSON_REVIEWER_EMAILS?.trim()) warnings.push("Missing LESSON_REVIEWER_EMAILS; publication needs a reviewer configured");
  if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_WEBHOOK_SECRET)
    warnings.push("Automatic call import is unavailable. Uploaded recordings with audio and transcript work without ElevenLabs.");
  if (env.USE_MOCKS !== "false") warnings.push("Check USE_MOCKS: mock recordings cannot be published as real lessons");
  const binary = env.FFMPEG_PATH || "ffmpeg";
  for (const [flag, capabilities] of [["-encoders", ["libx264", "aac", "libmp3lame"]], ["-filters", ["drawtext", "drawbox", "tpad"]]]) {
    const result = execute(binary, ["-hide_banner", flag], { encoding: "utf8", timeout: 15000, maxBuffer: 2 * 1024 * 1024 });
    if (result.error || result.status !== 0) {
      errors.push("FFmpeg is unavailable or failed; install it or set FFMPEG_PATH");
      break;
    }
    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    for (const name of capabilities)
      if (!new RegExp(`\\b${name}\\b`).test(output)) errors.push(`FFmpeg lacks required capability: ${name}`);
  }
  return { errors, warnings };
}
module.exports = { preflight };
