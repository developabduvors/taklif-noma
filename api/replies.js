// Replies to a guest-book wish, signed "Kuyov tomonidan" / "Kelin tomonidan" (+ optional name).
// Anyone can reply; only the admin can delete.
import { saveEntry, removeEntry, entryExists, isId, clean, isAdmin, json } from "./_store.js";

const SIDES = ["kuyov", "kelin"];

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (body.website) return json({ ok: true }); // honeypot
  const wishId = isId(body.wishId) ? body.wishId : "";
  const side = SIDES.includes(body.side) ? body.side : "";
  const name = clean(body.name, 60); // optional
  const message = clean(body.message, 500);
  if (!wishId || !side || !message) return json({ error: "Tomon va javob matni kerak" }, 400);
  if (!(await entryExists("wishes", wishId))) return json({ error: "Tabrik topilmadi" }, 404);
  const id = await saveEntry("replies", { wishId, side, name, message });
  return json({ ok: true, id }, 201);
}

export async function DELETE(req) {
  if (!isAdmin(req)) return json({ error: "Ruxsat yo'q" }, 401);
  const id = new URL(req.url).searchParams.get("id");
  if (!isId(id)) return json({ error: "Noto'g'ri id" }, 400);
  await removeEntry("replies", id);
  return json({ ok: true });
}
