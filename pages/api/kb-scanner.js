import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function checkAuth(token) {
  return token === process.env.ADMIN_TOKEN;
}

// Extrahuje JSON z textu (i z markdown bloků)
function extractJSON(text) {
  // Zkus najít JSON v markdown bloku
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }
  
  // Zkus najít JSON object v textu
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  
  return text.trim();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const token = req.headers["x-admin-token"];
  if (!checkAuth(token)) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // 1. STÁHNI HTML Z WEBU
  let websiteText = "";
  try {
    const fetchResponse = await fetch("https://www.rekant.cz", {
      headers: { "User-Agent": "Mozilla/5.0 KB-Scanner" },
    });
    const html = await fetchResponse.text();

    websiteText = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 20000);

    if (websiteText.length < 100) {
      return res.status(500).json({
        success: false,
        error: "Stažený web má příliš málo obsahu",
        textLength: websiteText.length,
      });
    }
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "Nemohu stáhnout web",
      details: e.message,
    });
  }

  // 2. POŠLI AI KE ZPRACOVÁNÍ
  let aiReply = "";
  let tokensUsed = null;
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: `Jsi expert na extrakci dat z webových stránek pro firmu Rekant s.r.o.

Vytvoř JSON KB ze zadaného obsahu webu rekant.cz.

DŮLEŽITÉ:
- VRAŤ POUZE JSON, ŽÁDNÝ KOMENTÁŘ
- ŽÁDNÉ markdown bloky (žádné \`\`\`json\`\`\`)
- POUZE čisté JSON {...}

STRUKTURA:
{
  "company": {
    "name": "Rekant s.r.o.",
    "tagline": "...",
    "address": "Severozápadní I. 285/8, Praha 4 – Spořilov",
    "phone": "244 471 760",
    "phone_shop": "777 041 813",
    "phone_service": "777 613 044",
    "email": "rekant@rekant.cz",
    "hours": "Po–Pá 8:00–16:00",
    "ico": "28233727",
    "vat": "CZ28233727",
    "established": "Od roku 2008",
    "description": "..."
  },
  "services": {
    "office_equipment": {"name": "Kancelářská technika", "description": "...", "brands": ["Konica Minolta", "Epson"]},
    "security": {"name": "Zabezpečení", "description": "...", "brands": ["Jablotron", "Dahua"]}
  },
  "products": {
    "bizhub_i_series": {"name": "Konica Minolta bizhub i-Series", "description": "...", "features": ["...", "..."]},
    "jablotron": {"name": "Jablotron 100+", "description": "...", "features": ["...", "..."]}
  },
  "faq": [
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ]
}

Vytvoř MINIMÁLNĚ 10 FAQ. Vrať POUZE JSON, nic víc!`,
      messages: [
        {
          role: "user",
          content: `Obsah www.rekant.cz:\n\n${websiteText}`,
        },
      ],
    });

    aiReply = response.content[0]?.text || "";
    tokensUsed = response.usage;
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "Anthropic API selhal",
      details: e.message,
    });
  }

  // 3. PARSE JSON
  let parsedKB;
  try {
    const cleanJson = extractJSON(aiReply);
    parsedKB = JSON.parse(cleanJson);
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "AI vrátila neplatný JSON",
      details: e.message,
      rawPreview: aiReply.substring(0, 500),
    });
  }

  // 4. VALIDACE
  if (!parsedKB.company) {
    parsedKB.company = {
      name: "Rekant s.r.o.",
      address: "Severozápadní I. 285/8, Praha 4 – Spořilov",
      phone: "244 471 760",
      email: "rekant@rekant.cz",
      hours: "Po–Pá 8:00–16:00",
    };
  }

  if (!parsedKB.faq || !Array.isArray(parsedKB.faq)) {
    parsedKB.faq = [];
  }

  // 5. METADATA
  parsedKB.lastUpdated = new Date().toISOString();
  parsedKB.lastScan = {
    date: new Date().toISOString(),
    source: "https://www.rekant.cz",
    method: "automatic-ai-scan",
    contentLength: websiteText.length,
  };

  // 6. VRAŤ DATA KLIENTOVI
  return res.status(200).json({
    success: true,
    message: "Web naskenován a AI zpracovala data",
    kb: parsedKB,
    tokensUsed,
    sourceLength: websiteText.length,
  });
}
