import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Jsi inteligentní AI asistent firmy Rekant s.r.o. Odpovídáš VŽDY česky, stručně (max 3 věty).
Firma: Rekant s.r.o., Praha 4. Tel: 244 471 760. Email: rekant@rekant.cz.
Oblasti: 1) Kancelářská technika – Konica Minolta bizhub, Epson WorkForce, pronájem od 290 Kč/měs
2) Zabezpečení – alarmy Jablotron 100+, kamery Dahua CCTV
3) Docházkové systémy – terminály, propojení s Pohoda/Money S3
4) Slaboproud – Cat.6/6A, LAN, IP telefony
Pokud se ptají na konkrétní oblast, přidej navigační odkaz: [NAV:km:Zobrazit tiskárny →] nebo [NAV:security:Zabezpečení →] nebo [NAV:contact:Poptávka →]`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (req.body.website) return res.status(200).json({ reply: "Dobrý den!" });

  const { messages } = req.body;
  if (!messages?.length) return res.status(400).json({ error: "Chybí zprávy" });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: SYSTEM,
      messages: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
    });
    res.status(200).json({ reply: response.content[0].text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Zavolejte na 244 471 760." });
  }
}
