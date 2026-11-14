// OWNER: Zohaib. GET the latest frame as an image, for <img src> on the live job view.
// ?frameId= returns a specific frame (record pages).
import { getFrame, latestFrame } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const frameId = new URL(req.url).searchParams.get("frameId");
  const f = frameId ? await getFrame(params.id, frameId) : await latestFrame(params.id);
  if (!f) return new Response(null, { status: 204 });
  const m = f.image.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
  if (!m) return Response.redirect(f.image, 302); // storage URL
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "no-store", "X-Frame-At": f.at },
  });
}
