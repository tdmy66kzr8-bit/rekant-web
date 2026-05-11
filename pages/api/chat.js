import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const client = new Anthropic();

// Načíst KB ze souboru
function loadKB() {
  const kbPath = path.join(process.cwd(), "public", "data", "kb.json");
  try {
    if (fs.existsSync(kbPath)) {
      const content = fs.readFileSync(kbPath, "utf8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("KB load error:", e.message);
  }
  return null;
}

const KB = loadKB();

// Vytvořit detailní KB text pro AI
function buildKBContext() {
  if (!KB) return "Knowledge base není dostupná.";

  let context = `# REKANT S.R.O. - KNOWLEDGE BASE\n\n`;

  // Základní info
  if (KB.company) {
    context += `## KONTAKTNÍ ÚDAJE\n`;
    context += `Název: ${KB.company.name}\n`;
    context += `Adresa: ${KB.company.address}\n`;
    context += `Telefon: ${KB.company.phone} (ústředna)\n`;
    context += `Prodej: ${KB.company.phone_shop}\n`;
    context += `Servis: ${KB.company.phone_service}\n`;
    context += `Email: ${KB.company.email}\n`;
    context += `Pracovní doba: ${KB.company.hours}\n`;
    context += `IČO: ${KB.company.ico}\n`;
    context += `\n`;
  }

  // Služby
  if (KB.services) {
    context += `## HLAVNÍ SLUŽBY\n`;
    context += `${KB.services.overview}\n\n`;
  }

  // Produkty
  if (KB.products) {
    context += `## PRODUKTY A ŘEŠENÍ\n`;
    
    if (KB.products.jablotron) {
      const j = KB.products.jablotron;
      context += `### ${j.name}\n`;
      context += `${j.description}\n`;
      context += `Vlastnosti: ${j.features.join(", ")}\n`;
      context += `Záruka: 24 měsíců.\n\n`;
    }

    if (KB.products.dahua_cameras) {
      const d = KB.products.dahua_cameras;
      context += `### ${d.name}\n`;
      context += `${d.description}\n`;
      context += `Výhody: ${d.advantages.join(", ")}\n\n`;
    }

    if (KB.products.hikvision_cameras) {
      const h = KB.products.hikvision_cameras;
      context += `### ${h.name}\n`;
      context += `${h.description}\n`;
      context += `AcuSense: Snižuje falešné poplachy o 90%+\n`;
      context += `ColorVu: Plnobarevný obraz v minimálním osvětlení\n\n`;
    }

    if (KB.products.access_control) {
      context += `### ${KB.products.access_control.name}\n`;
      context += `${KB.products.access_control.description}\n\n`;
    }

    if (KB.products.attendance_systems) {
      context += `### ${KB.products.attendance_systems.name}\n`;
      context += `${KB.products.attendance_systems.description}\n\n`;
    }

    if (KB.products.low_voltage) {
      context += `### ${KB.products.low_voltage.name}\n`;
      context += `${KB.products.low_voltage.description}\n\n`;
    }
  }

  // FAQ
  if (KB.faq && KB.faq.length > 0) {
    context += `## ČASTO KLADENÉ OTÁZKY\n`;
    KB.faq.forEach(item => {
      context += `Q: ${item.q}\nA: ${item.a}\n\n`;
    });
  }

  return context;
}

const SYSTEM_PROMPT = `Jsi profesionální AI asistent firmy Rekant s.r.o. — společnosti zabývající se prodejem, pronájmem a servisem kancelářské techniky, alarmů, kamer a slaboproudu v Praze.

INSTRUKCE:
1. Vždy odpovídej V ČEŠTINĚ, přívětivě a odborně.
2. Odpovědi buď STRUČNÉ (max 3-4 věty), pokud není potřeba více detailů.
3. Když se ptáš na něco specifického (cena, dostupnost, technické detaily) → vždy zdůrazni: "Přesné informace ti dá náš tým na 244 471 760 nebo chatuj dál!"
4. Pokud je otázka mimo KB a nevíš odpověď → nabídni: "To bych věděl přesněji, kontaktuj nás na 244 471 760 nebo zavolej na 777 041 813!"
5. NIKDY nezmiňuj Myself.cz nebo Verso.cz — jsou to konkurenti.
6. Pokud se ptáš na pracovní dobu → "Otevřeno Po–Pá 8:00–16:00, mimo to 777 041 813"
7. Nabízej relevantní producty/služby, když to dává smysl v kontextu.
8. Buď k dispozici 24/7, ale upozorni na pracovní dobu dispečinku (Po–Pá 8:00–15:45).

KNOWLEDGE BASE:
${buildKBContext()}`;

export default async function handler(req, res) {
  // CORS
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

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Chybí zprávy" });
    }

    // Omez na posledních 10 zpráv
    const safeMessages = messages.slice(-10).map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content || "").substring(0, 2000)
    }));

    // Volání Claude API
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: safeMessages,
    });

    const replyText = response.content[0]?.text || "Omlouvám se, nemohu odpovědět.";

    // Detekce handoffu
    const needsHandoff = 
      replyText.toLowerCase().includes("kontaktuj") ||
      replyText.toLowerCase().includes("zavolej") ||
      replyText.toLowerCase().includes("dispečink");

    return res.status(200).json({
      reply: replyText,
      needsHandoff: needsHandoff,
      operatorAvailable: isOperatorAvailable(),
    });

  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({
      error: "Chyba AI. Zavolejte 244 471 760.",
      details: error.message || "Neznámá chyba"
    });
  }
}

function isOperatorAvailable() {
  const now = new Date();
  const day = now.getDay(); // 0 = neděle
  const hour = now.getHours();
  return day >= 1 && day <= 5 && hour >= 8 && hour < 16;
}
