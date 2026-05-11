import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Načíst KB ze souboru
function loadKBFromFile() {
  const kbPath = path.join(process.cwd(), "public", "data", "kb.json");
  try {
    if (fs.existsSync(kbPath)) {
      return JSON.parse(fs.readFileSync(kbPath, "utf8"));
    }
  } catch (e) {
    console.warn("Chyba při čtení KB:", e.message);
  }
  
  // Default KB
  return {
    company: {
      name: "Rekant s.r.o.",
      phone: "244 471 760",
      email: "rekant@rekant.cz",
      hours: "Po–Pá 8:00–15:45",
    },
    products: {},
    faq: [],
  };
}

const KB = loadKBFromFile();

const SYSTEM_PROMPT = `Jsi inteligentní AI asistent firmy Rekant s.r.o. ve městě Praha.

PRAVIDLA:
1. Odpovídáš VŽDY v češtině, stručně (max 3 věty).
2. Když nevíš odpověď → řekni: "Nevím přesně, ale naše tým to ví – kontaktujte nás na ${KB.company.phone}!"
3. Pokud je otázka mimo KB → nabídni handoff: "Chcete mluvit s operátorem v čase ${KB.company.hours}?"
4. Základní info: ${KB.company.name}, Tel. ${KB.company.phone}, Email: ${KB.company.email}
5. Služby: Kancelářská technika, Alarmy, Kamery, Docházka, Slaboproud`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metoda není povolena" });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Chybí zprávy" });
    }

    // Bezpečnostní kontrola - omez na posledních 10 zpráv
    const safeMessages = messages.slice(-10).map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content || "").substring(0, 1000)
    }));

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: safeMessages,
    });

    const replyText = response.content[0]?.text || "Omlouvám se, nemohu odpovědět.";

    // Detekce handoffu
    const needsHandoff = 
      replyText.toLowerCase().includes("kontaktujte") ||
      replyText.toLowerCase().includes("nevím") ||
      replyText.toLowerCase().includes("operátor");

    return res.status(200).json({
      reply: replyText,
      needsHandoff: needsHandoff,
      operatorAvailable: isOperatorAvailable(),
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    return res.status(500).json({
      error: "Chyba v komunikaci. Zavolejte prosím 244 471 760.",
      details: error.message || "Neznámá chyba"
    });
  }
}

// Pracovní doba dispečinku
function isOperatorAvailable() {
  const now = new Date();
  const day = now.getDay(); // 0 = neděle, 1 = pondělí
  const hour = now.getHours();

  // Po–Pá 8:00–15:45
  return day >= 1 && day <= 5 && hour >= 8 && hour < 16;
}
