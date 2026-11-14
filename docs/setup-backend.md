<!-- OWNER: Zohaib (Photon + backend + voice number) -->
# Backend, Photon and voice setup

Everything goes in `.env.local` (never committed). After each step, the check command tells you it worked.

## 1. Supabase (database + frames), needed for Vercel

1. supabase.com → your project → **SQL Editor** → paste `supabase/schema.sql` → **Run**.
2. **Project Settings → API**: copy **Project URL** and the **service_role** key.
3. `.env.local`:
   ```
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service_role key>
   ```
Check: `npm run dev`, the log says `[db] using supabase backend`, then `npm run fake-call` works.

## 2. Photon API key (record text)

1. app.beta.photon.codes → your project → **Settings → API keys** → create a key with `project:read` and `project:write`.
2. `.env.local`: `PHOTON_API_KEY=<key>` (keep `PHOTON_PROJECT_ID` and `PHOTON_NUMBER` as they are).
3. Text the Photon number once from your own phone first (a shared iMessage line can only reply, never start a chat).

Check: `npm run photon-test -- +1<your phone>`. If it says `SHARED_LINE_INBOUND_REQUIRED`, do step 3. If the number is SMS-only, add `PHOTON_TEXT_PLATFORM=sms`.

## 3. Deploy (HTTPS for the camera, public URL for webhooks)

`npx vercel` → link to the team account → add every `.env.local` value under **Settings → Environment Variables** → set `NEXT_PUBLIC_APP_URL` to the Vercel URL → redeploy.
Check: open `https://<app>/api/stats`.

## 4. Photon number → ElevenLabs agent (voice)

Follow photon.codes/docs/beta/cookbooks/voice/elevenlabs (about 5 minutes):
1. Photon **Voice** → Set up default → **SIP** → Create profile → **Outbound calls** → SHA-256 → Enable → save the password.
2. ElevenLabs **Phone Numbers → Import number → From SIP Trunk**: your Photon number; Inbound: Media encryption *Allowed*, source IPs `0.0.0.0/0`; Outbound: `sip.photon.codes:5061`, TLS, the Photon username + saved password → Import → set **Agent** to Boomer.
3. Photon Voice profile → **Inbound calls** → destination `sips:sip.rtc.elevenlabs.io:5061`, TLS.

Check: call the number, the agent answers.

## 5. ElevenLabs webhooks (resume and memory)

ElevenLabs **Agents → Settings**:
1. Make up a long random string and save it as `VOICE_TOOL_SECRET` in Vercel and `.env.local`.
2. **Conversation initiation webhook**: `https://<app>/api/webhooks/voice/init`, header `x-boomer-secret: <VOICE_TOOL_SECRET>`. On the agent's **Security** tab, turn on *Fetch initiation client data from a webhook* and allow overriding **First message**.
3. **Post-call webhook**: `https://<app>/api/webhooks/voice`, HMAC auth. Copy its secret into `ELEVENLABS_WEBHOOK_SECRET`.
4. Every server tool (Sunny) sends the same `x-boomer-secret` header.

Check: call, finish step 1, hang up, call back. The agent should say "Welcome back. You were on step 2."

## 6. Inbound texts (optional)

Photon **Webhooks → Add a destination**: `https://<app>/api/webhooks/photon`, events `*`. Copy the `whsec_…` secret into `PHOTON_WEBHOOK_SECRET`.

## Demo phone

`DEMO_WORKER_PHONE=+1<the phone that calls>` makes the demo worker you, so your calls land on `demo-2041` and the record text comes to you.
