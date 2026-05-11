import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    const systemPrompt = `Jsi AI asistent Rekant s.r.o. v Praze.
Firma: www.rekant.cz
Odpovídáš V ČEŠTINĚ, stručně (max 3 věty).
Kontakt: 244 471 760, rekant@rekant.cz
Otevřeno: Po–Pá 8:00–16:00
Služby: Pronájem tiskáren, alarmy Jablotron, kamery Dahua/Hikvision, přístupové systémy, docházka.
Když neznáš odpověď → "Kontaktuj nás: 244 471 760"`;

    const safeMessages = messages.slice(-5).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content || "").substring(0, 500),
    }));

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: systemPrompt,
      messages: safeMessages,
    });

    const reply = response.content[0]?.text || "Omlouvám se, nemohu odpovědět.";

    return res.status(200).json({
      reply,
      needsHandoff: reply.toLowerCase().includes("kontaktuj"),
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
