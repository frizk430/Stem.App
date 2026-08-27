import React, { useState, useEffect } from "react";

// Public, password-gated live menu. Reached at /menu/daddyspipes, /menu/merc, or /menu/all.
// No login. It calls /api/menu (a serverless function) which returns ONLY menu-safe fields —
// never prices, customers, or financials. Prices are intentionally not shown here.

const CULT = { daddyspipes: { label: "Daddy's Pipes", color: "#4A90D9" }, merc: { label: "MERC", color: "#E8C24B" }, all: { label: "Full Menu", color: "#C9A24B" } };
const GRADE_COLOR = { A: "#C9A24B", B: "#8FAF8B", C: "#B98F5E", D: "#6B7264", T: "#C08FD8" };

export default function MenuPage() {
  // Path is /menu/<cultivation>. Default to "all".
  const parts = window.location.pathname.split("/").filter(Boolean); // ["menu","merc"]
  const cultivation = (parts[1] || "all").toLowerCase();
  const cult = CULT[cultivation] || CULT.all;

  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [menu, setMenu] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(pw) {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cultivation, password: pw ?? "" }),
      });
      const data = await r.json();
      if (r.status === 401 || data.needsPassword) { setNeedsPassword(true); setLoading(false); if (pw) setError("That password didn't work. Try again."); return; }
      if (!r.ok) { setError(data.error || "Couldn't load the menu."); setLoading(false); return; }
      setMenu(data.menu || []); setMeta({ companyName: data.companyName, generatedAt: data.generatedAt });
      setNeedsPassword(false);
    } catch (e) {
      setError("Couldn't reach the menu. Check your connection and try again.");
    }
    setLoading(false);
  }

  useEffect(() => { load(""); /* try once with no password; server says if one is needed */ }, []);

  // Group the flat menu by strain for display (grades listed under each strain).
  const byStrain = (() => {
    const m = {}; const order = [];
    (menu || []).forEach((it) => { if (!m[it.strain]) { m[it.strain] = { strain: it.strain, sourceLabel: it.sourceLabel, source: it.source, photo: it.photo, priceRange: it.priceRange, items: [] }; order.push(it.strain); } m[it.strain].items.push(it); if (!m[it.strain].photo && it.photo) m[it.strain].photo = it.photo; if (!m[it.strain].priceRange && it.priceRange) m[it.strain].priceRange = it.priceRange; });
    return order.map((k) => m[k]);
  })();
  const money = (n) => "$" + Number(n).toLocaleString();
  function rangeText(pr) {
    if (!pr) return null;
    if (pr.low != null && pr.high != null) return pr.low === pr.high ? `${money(pr.low)}/lb` : `${money(pr.low)}–${money(pr.high)}/lb`;
    if (pr.low != null) return `From ${money(pr.low)}/lb`;
    if (pr.high != null) return `Up to ${money(pr.high)}/lb`;
    return null;
  }

  return (
    <div style={S.page}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        @media (max-width: 640px) { .menu-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <header style={S.header}>
        <div style={{ ...S.badge, background: cult.color }}>{cult.label}</div>
        <h1 style={S.h1}>{meta?.companyName || "Live Menu"}</h1>
        <div style={S.sub}>Available flower · updated live</div>
      </header>

      {loading && <div style={S.center}>Loading menu…</div>}

      {!loading && needsPassword && (
        <div style={S.gate}>
          <div style={S.gateTitle}>This menu is private</div>
          <div style={S.gateSub}>Enter the password to view it.</div>
          <input
            style={S.input} type="password" value={password} autoFocus
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") load(password); }}
            placeholder="Password"
          />
          {error && <div style={S.err}>{error}</div>}
          <button style={{ ...S.btn, background: cult.color }} onClick={() => load(password)}>View Menu</button>
        </div>
      )}

      {!loading && !needsPassword && error && <div style={S.center}>{error}</div>}

      {!loading && !needsPassword && !error && (
        <>
          {byStrain.length === 0 ? (
            <div style={S.center}>Nothing in stock right now — check back soon.</div>
          ) : (
            <div className="menu-grid" style={S.grid}>
              {byStrain.map((g) => (
                <div key={g.strain} style={S.card}>
                  <div style={S.photoWrap}>
                    {g.photo ? <img src={g.photo} style={S.photo} alt={g.strain} /> : <div style={S.noPhoto}>🌿</div>}
                    <span style={{ ...S.sourceTag, color: g.source === "merc" ? "#12160F" : "#fff", background: g.source === "merc" ? "#E8C24B" : "#4A90D9" }}>{g.sourceLabel}</span>
                  </div>
                  <div style={S.cardBody}>
                    <div style={S.strainName}>{g.strain}</div>
                    <div style={S.gradeRow}>
                      {g.items.map((it, i) => (
                        <span key={i} style={{ ...S.gradeChip, borderColor: GRADE_COLOR[it.grade] || "#6B7264", color: GRADE_COLOR[it.grade] || "#B9BFA9" }}>
                          {it.gradeLabel}{it.isBest ? " ★" : ""} · {it.lbs} lb
                        </span>
                      ))}
                    </div>
                    {rangeText(g.priceRange) ? (
                      <div>
                        <div style={S.priceRange}>{rangeText(g.priceRange)}</div>
                        <div style={S.priceNote}>*Prices vary by batch and quality</div>
                      </div>
                    ) : (
                      <div style={S.askPricing}>Ask your rep for pricing</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <footer style={S.footer}>
            <div>Contact your sales rep to place an order.</div>
            <div style={{ opacity: 0.5, marginTop: 4, fontSize: 11 }}>Availability shown live. The Stem.</div>
          </footer>
        </>
      )}
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", background: "#12160F", color: "#EDE8D8", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", padding: "0 0 40px" },
  header: { textAlign: "center", padding: "34px 20px 20px", borderBottom: "1px solid #2A3324" },
  badge: { display: "inline-block", color: "#12160F", fontWeight: 800, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", padding: "4px 12px", borderRadius: 20, marginBottom: 12 },
  h1: { margin: "0 0 4px", fontSize: 26, fontWeight: 800, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: "#8C9483" },
  center: { textAlign: "center", padding: "60px 20px", color: "#8C9483", fontSize: 15 },
  gate: { maxWidth: 340, margin: "50px auto", padding: "0 20px", textAlign: "center" },
  gateTitle: { fontSize: 18, fontWeight: 700, marginBottom: 6 },
  gateSub: { fontSize: 13.5, color: "#8C9483", marginBottom: 18 },
  input: { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #2A3324", background: "#1A1F14", color: "#EDE8D8", fontSize: 15, marginBottom: 12, outline: "none" },
  btn: { width: "100%", padding: "12px", borderRadius: 10, border: "none", color: "#12160F", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  err: { color: "#C97B63", fontSize: 13, marginBottom: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, maxWidth: 1100, margin: "24px auto 0", padding: "0 20px" },
  card: { background: "#1A1F14", border: "1px solid #2A3324", borderRadius: 14, overflow: "hidden" },
  photoWrap: { position: "relative", width: "100%", height: 170, background: "#20261A" },
  photo: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  noPhoto: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, opacity: 0.3 },
  sourceTag: { position: "absolute", top: 10, right: 10, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20 },
  cardBody: { padding: "12px 14px 16px" },
  strainName: { fontSize: 17, fontWeight: 700, marginBottom: 8 },
  gradeRow: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  gradeChip: { fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 7, border: "1px solid", fontFamily: "'IBM Plex Mono', ui-monospace, monospace" },
  askPricing: { fontSize: 12.5, color: "#8C9483", fontStyle: "italic" },
  priceRange: { fontSize: 15, fontWeight: 700, color: "#C9A24B" },
  priceNote: { fontSize: 11, color: "#8C9483", fontStyle: "italic", marginTop: 2 },
  footer: { textAlign: "center", padding: "36px 20px 0", color: "#8C9483", fontSize: 13 },
};
