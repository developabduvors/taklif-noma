// Guest book: anyone can read and post; only the admin can delete.
// Each wish is signed by the guest's relation to the couple, e.g. side "kuyov" + relation "yangasi" → "Kuyovning yangasi".
import { saveEntry, readEntries, removeEntry, clean, isAdmin, json } from "./_store.js";

const SIDES = ["kuyov", "kelin"];

export async function GET() {
  const wishes = await readEntries("wishes", 200);
  // Only expose public fields; short CDN cache keeps page loads fast.
  return json(wishes.map(({ id, side, relation, name, message, createdAt }) => ({ id, side, relation, name, message, createdAt })), 200, {
    "cache-control": "public, s-maxage=10, stale-while-revalidate=60",
  });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (body.website) return json({ ok: true }); // honeypot field filled → bot, silently ignore
  const side = SIDES.includes(body.side) ? body.side : "";
  const relation = clean(body.relation, 40);
  const name = clean(body.name, 60); // optional
  const message = clean(body.message, 500);
  if (!side || !relation || !message) return json({ error: "Tomon, kimligingiz va tabrik kerak" }, 400);
  const id = await saveEntry("wishes", { side, relation, name, message });
  return json({ ok: true, id }, 201);
}

export async function DELETE(req) {
  if (!isAdmin(req)) return json({ error: "Ruxsat yo'q" }, 401);
  const id = clean(new URL(req.url).searchParams.get("id"), 40);
  if (!/^[\w-]+$/.test(id)) return json({ error: "Noto'g'ri id" }, 400);
  await removeEntry("wishes", id);
  return json({ ok: true });
}
