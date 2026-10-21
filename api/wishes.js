// Guest book: anyone can read and post; only the admin can delete.
// Each wish is signed by the guest's relation to the couple, e.g. side "kuyov" + relation "yangasi" → "Kuyovning yangasi".
import { saveEntry, readEntries, removeEntry, isId, clean, isAdmin, json } from "./_store.js";

const SIDES = ["kuyov", "kelin"];
const LIMITS = { message: 4000, relation: 40, name: 60 };

export async function GET() {
  const [wishes, replies] = await Promise.all([readEntries("wishes", 200), readEntries("replies", 1000)]);
  // group replies under their wish, oldest first so they read like a conversation
  const byWish = {};
  for (const r of replies.reverse()) (byWish[r.wishId] ||= []).push({ id: r.id, side: r.side, name: r.name, message: r.message, createdAt: r.createdAt });
  // Only expose public fields; short CDN cache keeps page loads fast.
  return json(wishes.map(({ id, side, relation, name, message, createdAt }) => ({ id, side, relation, name, message, createdAt, replies: byWish[id] || [] })), 200, {
    // browsers must always revalidate (otherwise a reload can show a stale list without the guest's own post);
    // only Vercel's CDN caches briefly, which keeps Blob list operations low during traffic spikes
    "cache-control": "no-cache",
    "vercel-cdn-cache-control": "max-age=10, stale-while-revalidate=30",
  });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (body.website) return json({ ok: true }); // honeypot field filled → bot, silently ignore
  const side = SIDES.includes(body.side) ? body.side : "";
  const relation = clean(body.relation, LIMITS.relation);
  const name = clean(body.name, LIMITS.name); // optional
  const raw = typeof body.message === "string" ? body.message.trim() : "";
  // a long congratulation must never be cut in half → refuse it and let the client show a clear message
  if (raw.length > LIMITS.message) return json({ error: "Matn juda uzun", code: "too_long", max: LIMITS.message }, 400);
  const message = raw;
  if (!side || !relation || !message) return json({ error: "Tomon, kimligingiz va tabrik kerak" }, 400);
  const id = await saveEntry("wishes", { side, relation, name, message });
  return json({ ok: true, id }, 201);
}

export async function DELETE(req) {
  if (!isAdmin(req)) return json({ error: "Ruxsat yo'q" }, 401);
  const id = new URL(req.url).searchParams.get("id");
  if (!isId(id)) return json({ error: "Noto'g'ri id" }, 400);
  await removeEntry("wishes", id);
  return json({ ok: true });
}
