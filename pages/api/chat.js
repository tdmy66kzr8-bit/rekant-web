import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function loadKB() {
  try {
    const kbPath = path.join(process.cwd(), "public", "data", "kb.json");
    if (fs.existsSync(kbPath)) {
      const content = fs.readFileSync(kbPath, "utf8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("KB load error:", e);
  }
  return null;
}

function buildSystemPrompt(kb) {
  let prompt = `Jsi profesionální AI asistent Rekant s.r.o. v Praze. Firmu Rekant najdeš na www.rekant.cz.

POKYNY:
- Odpovídej VŽDY V ČEŠTINĚ
- Buď stručný (2-3 věty)
- Když neznáš odpověď → "Kontaktuj nás na 244 471 760!"
- Nabízej relevantní produkty

KONTAKT:
Rekant s.r.o., Severozápadní I. 285/8, Praha 4
Tel: 244 471 760 (ústředna), 777 041 813 (prodej), 777 613 044 (servis)
Email: rekant@rekant.cz
Pracovní doba: Po–Pá 8:00–16:00

SLUŽBY: Pronájem tiskáren, Jablotron alarmy, Dahua/Hikvision kamery, Přístupové systémy, Docházka, Slaboproud

PRODUKTY:
- Jablotron 100+ — bezdrátový alarm s MyJABLOTRON aplikací
- Dahua IP kamery — 4K rozlišení, AI detekce, DMSS aplikace
- Hikvision AcuSense — snižuje falešné poplachy o 90%+, ColorVu technologie
- Přístupové systémy — RFID, biometrie, PIN
- Docházkové systémy — napojení na Pohoda, Money S3

${kb ? `\nKNOWLEDGE BASE:\n${JSON.stringify(kb, null, 2).substring(0, 2000)}` : ""}`;
  return prompt;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing messages" });
    }

    const kb = loadKB();
    const systemPrompt = buildSystemPrompt(kb);

    const safeMessages = messages.slice(-10).map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content || "").substring(0, 1000),
    }));

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: safeMessages,
    });

    const reply = response.content[0]?.text || "Omlouvám se, nemohu odpovědět.";

    const needsHandoff =
      reply.toLowerCase().includes("kontaktuj") ||
      reply.toLowerCase().includes("zavolej");

    return res.status(200).json({
      reply,
      needsHandoff,
      operatorAvailable: isOperatorAvailable(),
    });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({
      error: "Chat error: " + (error.message || "Unknown error"),
    });
  }
}

function isOperatorAvailable() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  return day >= 1 && day <= 5 && hour >= 8 && hour < 16;
}
