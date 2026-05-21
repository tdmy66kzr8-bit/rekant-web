// pages/api/chat.js
// Chatbot pro Rekant - parsuje KB a odpovídá na otázky

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const KB_KEY = 'rekant:kb';

// Rekant KB schema pro chatbot kontext
const REKANT_INFO = {
  name: "REKANT s.r.o.",
  address: "Severozápadní I. 285/8, Praha 4 – Spořilov",
  phone: "244 471 760",
  phone_shop: "777 041 813",
  phone_service: "777 613 044",
  email: "rekant@rekant.cz",
  hours: "Po-Pá 8:00-17:00, So 9:00-12:00",
  services: [
    "Konica Minolta tiskárny - prodej, pronájem, servis",
    "Epson WorkForce Pro - inkoustové systémy",
    "Brother, Canon tiskárny",
    "Jablotron 100+ - bezpečnostní systémy",
    "Dahua CCTV - IP kamerové systémy 4K",
    "Docházkové systémy",
    "Slaboproudé instalace"
  ],
  features: [
    "Doprava zdarma nad 2000 Kč",
    "Záruka 24-48 měsíců",
    "Servisní zásah do 24 hodin",
    "Pronájem a leasing",
    "Certifikovaný instalátor Jablotron a Dahua"
  ]
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages = [] } = req.body;

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'Nebyla poskytnutá zpráva' });
  }

  // Poslední zpráva uživatele
  const userMessage = messages[messages.length - 1]?.content || '';

  try {
    // Načti KB z Redis
    let kb = await redis.get(KB_KEY);
    if (!kb) {
      kb = { company: REKANT_INFO, news: [], faq: [] };
    }

    // Vytvoř context pro Claude
    const context = `
Jsi AI asistent pro REKANT s.r.o. - českou firmu na prodeji a servisu kancelářské techniky a bezpečnostních systémů.

ZÁKLADNÍ INFORMACE O FIRMĚ:
- Název: ${kb.company?.name || REKANT_INFO.name}
- Adresa: ${kb.company?.address || REKANT_INFO.address}
- Telefon ústředna: ${kb.company?.phone || REKANT_INFO.phone}
- Prodejna: ${kb.company?.phone_shop || REKANT_INFO.phone_shop}
- Servis: ${kb.company?.phone_service || REKANT_INFO.phone_service}
- Email: ${kb.company?.email || REKANT_INFO.email}
- Pracovní doba: ${kb.company?.hours || REKANT_INFO.hours}

SLUŽBY:
${REKANT_INFO.services.map(s => '- ' + s).join('\n')}

VÝHODY:
${REKANT_INFO.features.map(f => '- ' + f).join('\n')}

NOVINKY:
${(kb.news || []).slice(0, 3).map(n => `- ${n.date}: ${n.title} (${n.tag})`).join('\n') || '- Žádné novinky'}

INSTRUKCE:
- Odpovídej přátelsky a profesionálně v češtině
- Poskytni konkrétní kontaktní údaje když se zeptají
- Doporučuj relevantní služby na základě otázky
- Pokud se zeptají na něco, co neznáš, řekni že mohou kontaktovat firmu
- Buď stručný ale informativní (max 3-4 věty)
`;

    // Pošli do Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: context,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      return res.status(response.status).json({ error: 'API chyba' });
    }

    const data = await response.json();
    const reply = data.content[0]?.text || 'Omlouvám se, něco se pokazilo.';

    return res.status(200).json({
      success: true,
      reply: reply,
      pageInfo: {
        company: kb.company?.name,
        phone: kb.company?.phone
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      error: 'Chyba při zpracování zprávy',
      details: error.message
    });
  }
}
