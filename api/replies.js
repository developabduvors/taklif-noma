// Replies to a guest-book wish. Only the groom and the bride can reply: each has a personal
// secret link (?k=...) and the side ("Kuyov tomonidan" / "Kelin tomonidan") comes from the key itself.
import { timingSafeEqual } from "node:crypto";
import { saveEntry, removeEntry, entryExists, isId, clean, isAdmin, json } from "./_store.js";

const DEFAULT_NAME = { kuyov: "Bobomurod", kelin: "Sarvinoz" };
const LIMITS = { message: 4000, name: 60 };

const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};
// which side does this request's key belong to? ("" = no valid key)
function sideOf(req) {
  const key = req.headers.get("x-reply-key") || "";
  if (key && process.env.KUYOV_KEY && same(key, process.env.KUYOV_KEY)) return "kuyov";
  if (key && process.env.KELIN_KEY && same(key, process.env.KELIN_KEY)) return "kelin";
  return "";
}

// lets the page check a stored key and learn whose it is
export async function GET(req) {
  const side = sideOf(req);
  return side ? json({ side, name: DEFAULT_NAME[side] }) : json({ error: "Ruxsat yo'q" }, 401);
}

export async function POST(req) {
  const side = sideOf(req);
  if (!side) return json({ error: "Faqat kuyov va kelin javob bera oladi" }, 401);
  const body = await req.json().catch(() => ({}));
  const wishId = isId(body.wishId) ? body.wishId : "";
  const name = clean(body.name, LIMITS.name) || DEFAULT_NAME[side];
  const raw = typeof body.message === "string" ? body.message.trim() : "";
  // never cut a long reply in half → refuse it and let the client show a clear message
  if (raw.length > LIMITS.message) return json({ error: "Matn juda uzun", code: "too_long", max: LIMITS.message }, 400);
  const message = raw;
  if (!wishId || !message) return json({ error: "Javob matni kerak" }, 400);
  if (!(await entryExists("wishes", wishId))) return json({ error: "Tabrik topilmadi" }, 404);
  const id = await saveEntry("replies", { wishId, side, name, message });
  return json({ ok: true, id, side, name }, 201);
}

export async function DELETE(req) {
  if (!isAdmin(req)) return json({ error: "Ruxsat yo'q" }, 401);
  const id = new URL(req.url).searchParams.get("id");
  if (!isId(id)) return json({ error: "Noto'g'ri id" }, 400);
  await removeEntry("replies", id);
  return json({ ok: true });
}
