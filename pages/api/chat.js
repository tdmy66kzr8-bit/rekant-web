const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");

const client = new Anthropic();

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

    const safeMessages = messages.slice(-10).map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content || "").substring(0, 1000)
    }));

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: `Jsi AI asistent Rekant s.r.o. v Praze (www.rekant.cz).
Odpovídáš V ČEŠTINĚ, stručně (2-3 věty).
Kontakt: 244 471 760, rekant@rekant.cz
Služby: Pronájem tiskáren, alarmy Jablotron, kamery Dahua/Hikvision, přístupové systémy.
Když neznáš → "Kontaktuj nás: 244 471 760"`,
      messages: safeMessages
    });

    const reply = response.content[0]?.text || "Omlouvám se.";

    return res.status(200).json({
      reply,
      needsHandoff: reply.toLowerCase().includes("kontaktuj"),
      operatorAvailable: new Date().getHours() >= 8 && new Date().getHours() < 16 && new Date().getDay() >= 1 && new Date().getDay() <= 5
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
}
