// RSVP: guests submit; only the couple (admin key) can read the list.
import { saveEntry, readEntries, clean, isAdmin, json } from "./_store.js";

const LIMITS = { message: 4000, name: 80 };

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (body.website) return json({ ok: true }); // honeypot
  const name = clean(body.name, LIMITS.name);
  const attending = body.attending === "yes" ? "yes" : body.attending === "no" ? "no" : "";
  const raw = typeof body.message === "string" ? body.message.trim() : "";
  // never cut a long message in half → refuse it and let the client show a clear message
  if (raw.length > LIMITS.message) return json({ error: "Matn juda uzun", code: "too_long", max: LIMITS.message }, 400);
  const message = raw;
  if (!name || !attending) return json({ error: "Ism va javob kerak" }, 400);
  await saveEntry("rsvp", { name, attending, message });
  return json({ ok: true }, 201);
}

export async function GET(req) {
  if (!isAdmin(req)) return json({ error: "Ruxsat yo'q" }, 401);
  return json(await readEntries("rsvp", 1000));
}
