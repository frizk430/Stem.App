// Vercel Serverless Function — public, read-only, menu-ONLY slice of the app data.
//
// WHY THIS EXISTS: the whole app lives in one JSON blob (app_state.data) that also holds orders,
// customers, and financials. We must never expose that blob to the public. This function runs on the
// server, reads the blob with a SECRET service key (never sent to the browser), then returns ONLY
// menu-safe fields — strain, grade, room, availability, photo — with NO prices, customers, or money.
//
// It's gated by the same menu password stored in the app, and filters by cultivation (daddyspipes |
// merc | all). The browser never touches Supabase directly for this; it only ever sees the trimmed
// result below.
//
// ENV VARS required in Vercel (Project → Settings → Environment Variables):
//   SUPABASE_URL                — your project URL, e.g. https://leiuoniocesfqdjefzav.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   — the service_role key (SECRET — server only, never VITE_ prefixed)

import { createClient } from "@supabase/supabase-js";

const G_PER_LB = 453.59237;

export default async function handler(req, res) {
  // CORS / method
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return res.status(500).json({ error: "Server not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." });
  }

  // Inputs: cultivation filter + password. Accept from query (GET) or body (POST).
  const q = req.method === "POST" ? (req.body || {}) : (req.query || {});
  const cultivation = String(q.cultivation || "all").toLowerCase();
  const password = String(q.password || "");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: row, error } = await admin.from("app_state").select("data").eq("id", 1).single();
  if (error || !row) return res.status(500).json({ error: "Could not load menu." });
  const appData = row.data || {};

  // Password gate. If a menuPassword is set, it must match. If none is set, the menu is open.
  const menuPassword = (appData.menuPassword || "").trim();
  if (menuPassword && password !== menuPassword) {
    return res.status(401).json({ error: "wrong_password", needsPassword: true });
  }

  const SOURCE_LABEL = { daddyspipes: "Daddy's Pipes", merc: "MERC" };
  const GRADE_SHORT = { A: "A - Big", B: "B - Medium", C: "C - Small", D: "D", T: "Trim" };

  // Map a stored strain (often a number) to the customer-facing name. Entries already typed as names
  // pass through unchanged. Mirrors the app's strainDisplay helper.
  const strainNames = appData.strainNames || {};
  const strainPrices = appData.strainPrices || {};
  function displayStrain(strain) {
    if (!strain) return strain || "";
    const raw = String(strain).trim();
    if (strainNames[raw]) return strainNames[raw];
    const m = raw.match(/^#?\s*(\d+)\s*$/);
    if (m && strainNames[m[1]]) return strainNames[m[1]];
    const hit = Object.keys(strainNames).find((k) => k.trim().toLowerCase() === raw.toLowerCase());
    return hit ? strainNames[hit] : strain;
  }
  // Resolve a manual price range for a batch, keyed by strain NUMBER + GRADE.
  // strainPrices["7"] = { A:{low,high}, B:{...}, C:{...} }. Returns {low,high} or null.
  function priceRangeFor(strain, grade) {
    const raw = String(strain || "").trim();
    const num = (raw.match(/^#?\s*(\d+)\s*$/) || [])[1] || raw;
    const p = strainPrices[num];
    if (!p) return null;
    const g = p[grade];
    if (g && (g.low != null || g.high != null)) return { low: g.low, high: g.high };
    return null;
  }

  // Compute remaining grams for a batch: received + additions − shipped. Mirrors the app's math but
  // only for availability display (never exposes prices/customers).
  const shipments = Array.isArray(appData.shipments) ? appData.shipments : [];
  function shippedFor(batchId) {
    return shipments.filter((s) => s.batchId === batchId).reduce((sum, s) => sum + (Number(s.grams) || 0), 0);
  }

  const batches = Array.isArray(appData.batches) ? appData.batches : [];
  const photos = appData.photos || {};
  function photoFor(b) {
    return (photos.byBatch && photos.byBatch[b.id]) || (photos.byStrain && photos.byStrain[b.strain]) || (photos.bySource && photos.bySource[b.source]) || null;
  }

  // Build menu-only items, filtered by cultivation and in-stock.
  const items = [];
  for (const b of batches) {
    if (b.archived) continue;
    if (b.type && b.type !== "bucked") continue;
    const source = b.origin || b.source;
    if (cultivation !== "all" && source !== cultivation) continue;
    // IMPORTANT: receivedGrams already includes every addition's weight (authorize bumps receivedGrams
    // AND stores the tag in additions[]). So remaining = receivedGrams - shipped — do NOT re-add
    // additions here or the menu double-counts. This matches the app's inventory math exactly.
    const remaining = (Number(b.receivedGrams) || 0) - shippedFor(b.id);
    if (remaining <= 0) continue;
    items.push({
      strain: displayStrain(b.strain),
      grade: b.grade || "",
      gradeLabel: GRADE_SHORT[b.grade] || b.grade || "",
      room: b.room || "",
      source,
      sourceLabel: SOURCE_LABEL[source] || source,
      lbs: Math.round((remaining / G_PER_LB) * 10) / 10,
      isBest: !!b.isBest,
      photo: photoFor(b),
      priceRange: priceRangeFor(b.strain, b.grade),
    });
  }

  // Group by strain + grade for a clean menu (sum availability, one photo).
  const groups = {};
  const order = [];
  for (const it of items) {
    const key = `${it.strain}__${it.grade}__${it.source}`;
    if (!groups[key]) { groups[key] = { ...it }; order.push(key); }
    else { groups[key].lbs += it.lbs; if (!groups[key].photo && it.photo) groups[key].photo = it.photo; if (!groups[key].priceRange && it.priceRange) groups[key].priceRange = it.priceRange; }
  }
  const menu = order.map((k) => ({ ...groups[k], lbs: Math.round(groups[k].lbs * 10) / 10 }));

  // Sort: best-A first, then strain name.
  menu.sort((a, b) => (b.isBest - a.isBest) || a.strain.localeCompare(b.strain) || a.grade.localeCompare(b.grade));

  const companyName = cultivation === "merc" ? "MERC" : cultivation === "daddyspipes" ? "Daddy's Pipes" : "Daddy's Pipes & MERC";

  // Cache for 60s at the edge so it's "live" but not hammering the DB.
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res.status(200).json({ companyName, cultivation, generatedAt: new Date().toISOString(), count: menu.length, menu });
}
