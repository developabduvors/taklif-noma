// RSVP: guests submit; only the couple (admin key) can read the list.
import { saveEntry, readEntries, clean, isAdmin, json } from "./_store.js";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (body.website) return json({ ok: true }); // honeypot
  const name = clean(body.name, 80);
  const attending = body.attending === "yes" ? "yes" : body.attending === "no" ? "no" : "";
  const message = clean(body.message, 500);
  if (!name || !attending) return json({ error: "Ism va javob kerak" }, 400);
  await saveEntry("rsvp", { name, attending, message });
  return json({ ok: true }, 201);
}

export async function GET(req) {
  if (!isAdmin(req)) return json({ error: "Ruxsat yo'q" }, 401);
  return json(await readEntries("rsvp", 1000));
}
