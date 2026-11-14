/** Read env in one place so lanes don't each invent their own flags. */
export const USE_MOCKS = process.env.USE_MOCKS !== "false";

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}. See .env.example`);
  return v;
}
