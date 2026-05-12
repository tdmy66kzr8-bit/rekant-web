import Anthropic from "@anthropic-ai/sdk";
import { Redis } from "@upstash/redis";
import fs from "fs";
import path from "path";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const redis = Redis.fromEnv();
const KB_KEY = "rekant:kb";

async function loadKB() {
  try {
    const dbKB = await redis.get(KB_KEY);
    if (dbKB) return dbKB;
  } catch (e) {
    console.warn("Redis not available:", e.message);
  }

  try {
    const kbPath = path.join(process.cwd(), "public", "data", "kb.json");
    if (fs.existsSync(kbPath)) {
      return JSON.parse(fs.readFileSync(kbPath, "utf-8"));
    }
  } catch (e) {
    console.error("File KB error:", e.message);
  }

  return null;
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
      return res.status(400).json({ error: "Invalid messages" });
    }

    const kb = await loadKB();
    const kbContext = kb ? JSON.stringify(kb, null, 2) : "";

    const systemPrompt = `Jsi AI asistent firmy Rekant s.r.o. v Praze.
Odpovídáš VŽDY V ČEŠTINĚ, stručně (max 3-4 věty), profesionálně.

ZÁKLADNÍ INFORMACE:
- Firma: Rekant s.r.o., www.rekant.cz
- Adresa: Severozápadní I. 285/8, Praha 4 – Spořilov
- Pracovní doba: Po–Pá 8:00–16:00

DŮLEŽITÁ PRAVIDLA:
1. NIKDY nezmiňuj konkurenty Myself.cz nebo Verso.cz!
2. Pokud neznáš odpověď, řekni: "Pro přesné informace volejte ústřednu"
3. Buď přátelský a profesionální
4. Doporučuj naše služby a produkty
5. U cenových dotazů vždy odkaž na telefonát/email
6. POUŽÍVAJ AKTUÁLNÍ ÚDAJE Z KNOWLEDGE BASE (kontakty se mohou měnit)

ZNALOSTNÍ BÁZE FIRMY (aktuální):
${kbContext}`;

    const safeMessages = messages.slice(-5).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content || "").substring(0, 500),
    }));

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: systemPrompt,
      messages: safeMessages,
    });

    const reply = response.content[0]?.text || "Omlouvám se, nemohu odpovědět.";

    return res.status(200).json({
      reply,
      needsHandoff:
        reply.toLowerCase().includes("kontaktuj") ||
        reply.toLowerCase().includes("volejte"),
      operatorAvailable: isOperatorOnline(),
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({
      error: "Chat error",
      message: error.message || "Unknown error",
    });
  }
}

function isOperatorOnline() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  return day >= 1 && day <= 5 && hour >= 8 && hour < 16;
}
