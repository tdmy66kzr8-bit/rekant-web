import Anthropic from "@anthropic-ai/sdk";
import { Redis } from "@upstash/redis";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const redis = Redis.fromEnv();
const KB_KEY = "rekant:kb";

function checkAuth(token) {
  return token === process.env.ADMIN_TOKEN;
}

function extractJSON(text) {
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) return jsonBlockMatch[1].trim();
  
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  
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

  // 1. STÁHNI HTML
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
      });
    }
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "Nemohu stáhnout web",
      details: e.message,
    });
  }

  // 2. NAČTI AKTUÁLNÍ KB Z DATABÁZE (zachovat kontakty!)
  let currentKB = {};
  try {
    const dbKB = await redis.get(KB_KEY);
    if (dbKB) currentKB = dbKB;
  } catch (e) {
    console.warn("Cannot load current KB:", e.message);
  }

  // 3. POŠLI AI - ALE POUZE PRO POPISY, PRODUKTY, FAQ!
  let aiReply = "";
  let tokensUsed = null;
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: `Jsi expert na extrakci dat z webových stránek pro firmu Rekant s.r.o.

ÚKOL: Z obsahu webu rekant.cz vytvoř JSON s POPISY SLUŽEB, PRODUKTŮ A FAQ.

DŮLEŽITÉ: 
- NEPIŠEŠ telefony, emaily, adresu, IČO ani jiné kontakty!
- Soustřeď se POUZE na popisy služeb, produktů a FAQ otázky
- Vrať POUZE JSON, žádný komentář, žádné markdown bloky

STRUKTURA:
{
  "services": {
    "office_equipment": {
      "name": "Kancelářská technika",
      "description": "...",
      "brands": ["Konica Minolta", "Epson", "..."]
    },
    "security": {
      "name": "Zabezpečení",
      "description": "...",
      "brands": ["Jablotron", "Dahua", "..."]
    },
    "attendance": {
      "name": "Docházkové systémy",
      "description": "..."
    },
    "low_voltage": {
      "name": "Slaboproud",
      "description": "..."
    }
  },
  "products": {
    "bizhub_i_series": {
      "name": "Konica Minolta bizhub i-Series",
      "description": "...",
      "features": ["...", "..."]
    },
    "jablotron": {
      "name": "Jablotron 100+",
      "description": "...",
      "features": ["...", "..."]
    },
    "dahua_cctv": {
      "name": "Dahua CCTV",
      "description": "...",
      "features": ["...", "..."]
    },
    "hikvision_acusense": {
      "name": "Hikvision AcuSense",
      "description": "...",
      "features": ["...", "..."]
    }
  },
  "faq": [
    {"q": "...", "a": "..."}
  ]
}

Vytvoř MINIMÁLNĚ 10 FAQ otázek. POUZE JSON!`,
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

  // 4. PARSE JSON
  let parsedKB;
  try {
    const cleanJson = extractJSON(aiReply);
    parsedKB = JSON.parse(cleanJson);
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "AI vrátila neplatný JSON",
      details: e.message,
    });
  }

  // 5. SLOUČIT - ZACHOVAT KONTAKTY Z CURRENT KB!
  const mergedKB = {
    // ZACHOVAT aktuální kontakty (admin změny!)
    company: currentKB.company || {
      name: "Rekant s.r.o.",
      address: "Severozápadní I. 285/8, Praha 4 – Spořilov",
      phone: "244 471 760",
      phone_shop: "777 041 813",
      phone_service: "777 613 044",
      email: "rekant@rekant.cz",
      hours: "Po–Pá 8:00–16:00",
    },
    // AKTUALIZOVAT z webu
    services: parsedKB.services || currentKB.services || {},
    products: parsedKB.products || currentKB.products || {},
    faq: parsedKB.faq || currentKB.faq || [],
    // METADATA
    lastUpdated: new Date().toISOString(),
    lastScan: {
      date: new Date().toISOString(),
      source: "https://www.rekant.cz",
      method: "automatic-ai-scan-merge",
      preserved: ["company"],
      updated: ["services", "products", "faq"],
      contentLength: websiteText.length,
    },
  };

  // 6. ULOŽ DO REDIS
  try {
    await redis.set(KB_KEY, mergedKB);
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "Nelze uložit do databáze",
      details: e.message,
    });
  }

  // 7. VRAŤ
  return res.status(200).json({
    success: true,
    message: "Web naskenován! Popisy a FAQ aktualizovány, kontakty zachovány.",
    kb: mergedKB,
    tokensUsed,
    preserved: ["company - kontakty se nepřepisují, edituj je v záložce Firma"],
    updated: ["services - popisy služeb", "products - popisy produktů", "faq - otázky a odpovědi"],
  });
}
