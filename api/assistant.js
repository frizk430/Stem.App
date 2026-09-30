// api/assistant.js
// Vercel serverless function behind the floating "AI bubble" available on every tab.
// It does NOT do any math and NEVER states inventory numbers itself — it only classifies
// what the person is asking for and extracts structured fields. All matching against real
// batches, all quantity totals, and all order creation happen deterministically in App.jsx,
// after the person reviews what was found.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
  }

  try {
    const { text, rooms, grades, strainNames } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: "No text provided" });
    }

    const strainNameLines = Object.entries(strainNames || {})
      .map(([num, name]) => `#${num} = ${name}`)
      .join("\n");

    const prompt = `You are the intent router for a cannabis inventory app's quick-entry assistant. Decide whether the person is PLACING AN ORDER or ASKING A QUESTION about inventory. Output ONLY valid JSON, no preamble, no markdown fences.

Valid rooms: ${JSON.stringify(rooms || [])}
Valid grades: ${JSON.stringify(grades || [])}
Known strain number shortcuts:
${strainNameLines || "(none registered)"}

If it's an ORDER (mentions selling, a price, "new order", quantities being sold, etc.):
Respond with: {"type": "order", "lines": [{"raw": "...", "room": "...", "strainQuery": "...", "grade": "...", "qtyLb": 0, "priceType": "perlb", "priceValue": 0}]}
Same extraction rules as before: room/grade must be the closest match from the valid lists or null; strainQuery is verbatim, never resolved by you; qtyLb is null if not mentioned — never guess; priceType is "total" only if explicitly stated as a lump sum, otherwise "perlb"; priceValue is null if no price mentioned.

If it's a QUESTION about stock/inventory (how much, do I have, what's left, etc.):
Respond with: {"type": "question", "strainQuery": "... or null", "room": "... or null (closest match from valid rooms)", "grade": "... or null (closest match from valid grades)"}
Extract only what they actually asked about — leave a field null if they didn't specify it (e.g. asking about a strain with no room mentioned means room is null, meaning "across all rooms").

If you genuinely can't tell what they want:
Respond with: {"type": "unclear"}

Message to classify:
${text}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return res.status(502).json({ error: "AI request failed" });
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    const raw = textBlock ? textBlock.text.trim() : "";
    const cleaned = raw.replace(/^```(json)?/i, "").replace(/```$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse AI JSON:", cleaned);
      return res.status(502).json({ error: "Couldn't understand that — try rephrasing." });
    }

    if (!parsed || !parsed.type) {
      return res.status(502).json({ error: "AI response was malformed." });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("assistant error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
