import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function checkAuth(token) {
  return token === process.env.ADMIN_TOKEN;
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
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. STÁHNI HTML
    const websiteUrl = "https://www.rekant.cz";
    let websiteText = "";

    try {
      const fetchResponse = await fetch(websiteUrl);
      const html = await fetchResponse.text();

      // Vyčisti HTML
      websiteText = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 25000);
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: "Nemohu stáhnout www.rekant.cz",
        details: e.message,
      });
    }

    // 2. POŠLI AI KE ZPRACOVÁNÍ
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: `Jsi expert na extrakci dat z webových stránek pro firmu Rekant s.r.o.

ÚKOL:
Z poskytnutého obsahu webu rekant.cz vytvoř strukturovaný JSON s informacemi o firmě.

VRAŤ POUZE ČISTÉ JSON, ŽÁDNÝ KOMENTÁŘ, ŽÁDNÝ MARKDOWN, ŽÁDNÉ \`\`\`json\`\`\`.

STRUKTURA:
{
  "company": {
    "name": "Rekant s.r.o.",
    "tagline": "...",
    "address": "...",
    "phone": "244 471 760",
    "phone_shop": "777 041 813",
    "phone_service": "777 613 044",
    "email": "rekant@rekant.cz",
    "hours": "Po–Pá 8:00–16:00",
    "ico": "28233727",
    "vat": "CZ28233727",
    "description": "..."
  },
  "services": {
    "office_equipment": { "name": "...", "description": "...", "brands": [], "rental_info": "..." },
    "security": { "name": "...", "description": "...", "brands": [] },
    "attendance": { "name": "...", "description": "..." },
    "low_voltage": { "name": "...", "description": "..." }
  },
  "products": {
    "bizhub_i_series": { "name": "...", "description": "...", "features": [] },
    "jablotron": { "name": "...", "description": "...", "features": [] },
    "dahua_cctv": { "name": "...", "description": "...", "features": [] },
    "hikvision_acusense": { "name": "...", "description": "...", "features": [] }
  },
  "faq": [
    { "q": "...", "a": "..." }
  ]
}

DŮLEŽITÉ:
- Pokud něco není v obsahu, použij rozumnou defaultní hodnotu
- Telefon a email jsou: 244 471 760, rekant@rekant.cz
- Pracovní doba: Po-Pá 8:00-16:00
- Vytvoř alespoň 10 FAQ otázek na základě obsahu
- Vrať POUZE JSON, nic víc`,
      messages: [
        {
          role: "user",
          content: `Zpracuj tento obsah webu rekant.cz:\n\n${websiteText}`,
        },
      ],
    });

    const reply = response.content[0]?.text || "";

    // 3. PARSE JSON
    let parsedKB;
    try {
      const cleanJson = reply
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      parsedKB = JSON.parse(cleanJson);
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: "AI vrátila neplatný JSON",
        details: e.message,
        rawResponse: reply.substring(0, 500),
      });
    }

    // 4. PŘIDEJ METADATA
    parsedKB.lastUpdated = new Date().toISOString();
    parsedKB.lastScan = {
      date: new Date().toISOString(),
      source: websiteUrl,
      method: "automatic-ai-scan",
    };

    // 5. VRAŤ DATA - klient je uloží přes kb-manager
    return res.status(200).json({
      success: true,
      message: "Obsah webu byl naskenován a zpracován AI",
      kb: parsedKB,
      tokensUsed: response.usage,
      sourceLength: websiteText.length,
    });
  } catch (error) {
    console.error("Scanner error:", error);
    return res.status(500).json({
      success: false,
      error: "Scanner error",
      message: error.message,
    });
  }
}
