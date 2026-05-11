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
    console.warn("Chyba při čtení KB souboru, používám default KB");
  }
  
  // Default Knowledge Base – používá se při prvním spuštění
  return {
    company: {
      name: "Rekant s.r.o.",
      address: "Severozápadní I. 285/8, Praha 4 – Spořilov",
      phone: "244 471 760",
      phone_shop: "777 041 813",
      phone_service: "777 613 044",
      email: "rekant@rekant.cz",
      databox: "wk8w2cx",
      ico: "28233727",
      vat: "CZ28233727",
      hours: "Po–Pá 8:00–15:45",
      established: "Více než 15 let na trhu",
      clients: "3800+ spokojených klientů",
    },
    
    products: {
      konica_minolta: {
        name: "Konica Minolta bizhub i-Series",
        category: "Kancelářská technika",
        description: "Moderní barevné i černobílé multifunkční tiskárny",
        models: [
          { model: "bizhub i-Series C360", type: "Barevná", speed: "36 str/min", price: "od 45 000 Kč" },
          { model: "bizhub i-Series C451", type: "Barevná", speed: "45 str/min", price: "od 65 000 Kč" },
          { model: "bizhub i-Series C550", type: "Barevná", speed: "55 str/min", price: "od 85 000 Kč" },
        ],
        features: "Tisk, kopírování, skenování, síťový tisk, propojení s Pohoda",
        warranty: "24 měsíců",
        rental: "od 290 Kč/měsíc",
      },
      epson: {
        name: "Epson WorkForce Pro",
        category: "Kancelářská technika",
        description: "Spolehlivé inkoustové tiskárny pro kanceláře",
        models: [
          { model: "WorkForce Pro WF-C5790", type: "Barevná tiskárna", price: "od 15 000 Kč" },
        ],
        features: "Vysokorychlostní tisk, nízké náklady, cloud",
        warranty: "36 měsíců",
        rental: "od 290 Kč/měsíc",
      },
      jablotron: {
        name: "Jablotron 100+",
        category: "Zabezpečovací systémy",
        description: "Certifikované alarmové systémy",
        features: "Bezdrátové senzory, mobilní app, okamžité hlášení",
        certification: "Autorizovaný instalátor",
      },
    },

    faq: [
      {
        q: "Jaké máte kontaktní údaje?",
        a: "Rekant s.r.o., tel. 244 471 760, email rekant@rekant.cz, Severozápadní I. 285/8, Praha 4."
      },
      {
        q: "Provozní doba?",
        a: "Po–Pá 8:00–15:45. Tísňová linka: 777 041 813."
      },
      {
        q: "Nabízíte pronájem techniky?",
        a: "Ano, pronájmy od 290 Kč/měsíc včetně údržby a servisu."
      },
      {
        q: "Poskytujete servis a garanci?",
        a: "Ano, 24h servis a záruka 24 měsíců s možností prodloužení."
      },
    ],
  };
}

const KNOWLEDGE_BASE = loadKBFromFile();

const SYSTEM_PROMPT = (kb) => `Jsi inteligentní AI asistent firmy ${kb.company.name} ve městě Praha.

DŮLEŽITÉ PRAVIDLA:
1. Odpovídáš VŽDY v češtině, stručně (max 3 věty).
2. Když nevíš odpověď → řekni jasně: "Nevím přesně, ale naše tým to ví – kontaktujte nás!"
3. Pokud je otázka mimo tvou KB NEBO zákazník žádá konkrétní nabídku → nabídni handoff: "Chcete mluvit s operátorem v čase Po–Pá 8:00–15:45? Připojím vás!"
4. Přidej relevantní navigační tlačítka: [NAV:km], [NAV:security], [NAV:contact]
5. Cituj konkrétní ceny jen když je znáš - jinak zaslani: tel. 244 471 760

KONTAKT: ${kb.company.phone} | ${kb.company.email}
OTEVÍRACÍ DOBA: ${kb.company.hours}
SLUŽBY: Kancelářská technika, Alarmy Jablotron, Kamery Dahua/Hikvision, Docházka, Slaboproud`;

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { messages } = req.body;

  if (!messages?.length) {
    return res.status(400).json({ error: "Chybí zprávy" });
  }

  try {
    // Přenačíst KB (může se změnit pomocí admin panelu)
    const currentKB = loadKBFromFile();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: SYSTEM_PROMPT(currentKB),
      messages: messages.slice(-15).map(m => ({ 
        role: m.role, 
        content: m.content 
      })),
    });

    const replyText = response.content[0].text;

    // Detekce potřeby handoffu
    const needsHandoff = 
      replyText.includes("Chcete mluvit s operátorem") ||
      replyText.includes("kontaktujte nás") ||
      replyText.includes("Nevím");

    res.status(200).json({ 
      reply: replyText,
      needsHandoff: needsHandoff,
      operatorAvailable: isOperatorAvailable(),
    });
  } catch (e) {
    console.error("Chat API error:", e);
    res.status(500).json({ 
      error: "Chyba v komunikaci. Zavolejte 244 471 760." 
    });
  }
}

// Pracovní doba dispečinku
function isOperatorAvailable() {
  const now = new Date();
  const day = now.getDay(); // 0 = neděle, 1 = pondělí, ..., 5 = pátek
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Po–Pá 8:00–15:45
  if (day >= 1 && day <= 5) {
    if (hour >= 8 && hour < 16) {
      if (hour === 15 && minute <= 45) {
        return true;
      } else if (hour < 15) {
        return true;
      }
    }
  }
  return false;
}
