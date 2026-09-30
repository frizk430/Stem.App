// api/parse-order.js
// Vercel serverless function. Keeps the Anthropic API key on the server.
// Takes Frank's shorthand order text plus the real rooms/strains/grades currently
// in inventory, and returns structured line items. It does NOT touch inventory or
// create anything — matching against real batches and creating the order both
// happen client-side in App.jsx, after Frank reviews a confirm screen.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
  }

  try {
    const { text, rooms, strainNames, grades } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: "No text provided" });
    }

    const strainNameLines = Object.entries(strainNames || {})
      .map(([num, name]) => `#${num} = ${name}`)
      .join("\n");

    const prompt = `Extract order line items from shorthand cannabis order text. Output ONLY valid JSON, no preamble, no markdown fences.

Valid rooms: ${JSON.stringify(rooms || [])}
Valid grades: ${JSON.stringify(grades || [])}
Known strain number shortcuts (a number may refer to one of these strains, but the person may also type a strain name directly, or a number not in this list):
${strainNameLines || "(none registered)"}

Rules:
- Split the text into one entry per distinct item mentioned.
- "room" must be the closest matching value from the valid rooms list above (case-insensitive match), or null if you can't tell.
- "strainQuery" is whatever the person used to identify the strain — copy it verbatim (could be a number like "7" or a name like "Zours"). Do not try to resolve it yourself. Never include a grade letter or word in strainQuery — "Mega Queso A" means strainQuery "Mega Queso" and grade "A", not strainQuery "Mega Queso A".
- "grade" must be the closest matching value from the valid grades list above (case-insensitive match), or null if not mentioned.
- "qtyLb" is the quantity in pounds as a number. If no quantity is mentioned for an entry, use null — never guess or default it.
- "priceType" is "total" only if the person explicitly indicates the price is for the whole line (words like "total", "flat", "for the lot"). Otherwise "priceType" is "perlb" — this is the default.
- "priceValue" is the price as a number (no $ sign), or null if no price was mentioned.

Respond with exactly this shape:
{"lines": [{"raw": "the portion of text this entry came from", "room": "...", "strainQuery": "...", "grade": "...", "qtyLb": 0, "priceType": "perlb", "priceValue": 0}]}

Text to parse:
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

    if (!parsed || !Array.isArray(parsed.lines)) {
      return res.status(502).json({ error: "AI response was missing order lines." });
    }

    return res.status(200).json({ lines: parsed.lines });
  } catch (err) {
    console.error("parse-order error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
