// Shared helpers for the guest book + RSVP endpoints.
// Files starting with "_" inside /api are not exposed as routes by Vercel.
import { put, list, get, del } from "@vercel/blob";

// One JSON file per entry → concurrent writes never overwrite each other.
export async function saveEntry(folder, data) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await put(`${folder}/${id}.json`, JSON.stringify({ id, ...data, createdAt: new Date().toISOString() }), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
  });
  return id;
}

export async function readEntries(folder, limit = 200) {
  const { blobs } = await list({ prefix: `${folder}/`, limit: 1000 });
  const newest = blobs.sort((a, b) => b.pathname.localeCompare(a.pathname)).slice(0, limit);
  const entries = await Promise.all(newest.map(async (b) => {
    const res = await get(b.pathname, { access: "private" });
    if (!res || res.statusCode !== 200) return null;
    return JSON.parse(await new Response(res.stream).text());
  }));
  return entries.filter(Boolean);
}

export const removeEntry = (folder, id) => del(`${folder}/${id}.json`);

// Trim + length-cap user input; returns "" for non-strings.
export const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const isAdmin = (req) =>
  !!process.env.ADMIN_KEY && req.headers.get("x-admin-key") === process.env.ADMIN_KEY;

export const json = (body, status = 200, headers = {}) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
