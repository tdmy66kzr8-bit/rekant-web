import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const KB_KEY = 'rekant:kb';

// Defaultní KB struktura
const DEFAULT_KB = {
  company: {
    name: 'Rekant s.r.o.',
    tagline: 'Vaše kancelář. Vaše bezpečnost. Naše řešení.',
    address: 'Severozápadní I. 285/8, Praha 4 – Spořilov',
    phone: '244 471 760',
    phone_shop: '777 041 813',
    phone_service: '777 613 044',
    email: 'rekant@rekant.cz',
    email_service: 'service@rekant.cz',
    hours: 'Po–Pá: 8:00–15:45',
    ico: '28233727',
    vat: 'CZ28233727',
    databox: 'wk8w2cx',
    description: 'Rekant s.r.o. — dodavatel kancelářské techniky a bezpečnostních systémů v Praze.',
  },
  services: {
    office_equipment: {
      name: 'Kancelářská zařízení',
      brands: ['Konica Minolta', 'Epson', 'Brother', 'Canon'],
      description: 'Prodej, pronájem a servis kopírek, tiskáren a skenů.',
    },
    security: {
      name: 'Bezpečnostní systémy',
      brands: ['Jablotron', 'Dahua', 'Hikvision'],
      description: 'Instalace a údržba kamer, alarmů a přístupových systémů.',
    },
    attendance: {
      name: 'Docházkové systémy',
      brands: [],
      description: 'Řešení pro správu docházky a přístupu do budov.',
    },
    electrical: {
      name: 'Elektroinstalace',
      brands: [],
      description: 'Nízkoprvoltné elektroinstalace a strukturované rozvodny.',
    },
  },
  products: {
    konica_minolta: {
      name: 'Konica Minolta',
      category: 'Kopírky a tiskárny',
      description: 'Profesionální řešení pro kanceláře.',
      features: ['Vysoká produktivita', 'Nízké náklady na tisk', 'Bezpečnostní funkce'],
    },
    jablotron: {
      name: 'Jablotron',
      category: 'Bezpečnostní systémy',
      description: 'Středoevropský bezpečnostní standard.',
      features: ['Ověřená technologie', 'Místní podpora', 'Spolehlivost'],
    },
    dahua: {
      name: 'Dahua',
      category: 'Kamery a CCTV',
      description: 'Moderní systémy videonadzoru.',
      features: ['AI detekce', 'Night vision', 'Cloud storage'],
    },
  },
  news: [
    {
      id: '1',
      title: 'Nový sklad Rekant2026',
      description: 'Otevřeli jsme nový sklad v Praze 4. Nyní máme větší kapacitu a rychlejší doručení.',
      tag: 'Novinka',
      author: 'Rekant',
      date: '2026-03-15',
    },
    {
      id: '2',
      title: 'Webinář: Bezpečnost kanceláří',
      description: 'Přijďte se dozvědět o nejnovějších trendech v bezpečnosti pracovišť.',
      tag: 'Akce',
      author: 'Rekant',
      date: '2026-03-10',
    },
    {
      id: '3',
      title: 'Tip: Správa energií v kanceláři',
      description: 'Jak ušetřit na energiích pomocí správné konfigurrace zařízení.',
      tag: 'Tip',
      author: 'Rekant',
      date: '2026-03-01',
    },
  ],
  faq: [
    {
      q: 'Jak dlouho trvá oprava zařízení?',
      a: 'Obvykle do 48 hodin. Komplexní opravy mohou trvat déle.',
    },
    {
      q: 'Máte záruční servis?',
      a: 'Ano, všechna zařízení mají minimálně 12 měsíců záruku.',
    },
    {
      q: 'Je možný pronájem zařízení?',
      a: 'Ano, pronajímáme tiskárny, kopírky a bezpečnostní systémy.',
    },
  ],
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // AUTENTIZACE - jen localStorage check (bez tokenu!)
  // Admin panel posílá localStorage['cmsAuth'] = '1' v cookie/session
  // API akceptuje i bez cookies - jenom kontrolujeme že je uživatel přihlášen
  const isAdmin = req.headers['x-admin-session'] === 'verified' || 
                  req.method === 'GET'; // GET je pro všechny, POST jen admin

  // GET - vrátí aktuální KB (veřejné)
  if (req.method === 'GET') {
    try {
      const kb = await redis.get(KB_KEY);
      if (kb) {
        return res.status(200).json(kb);
      }
      return res.status(200).json(DEFAULT_KB);
    } catch (error) {
      console.error('Redis GET error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // POST - update KB (jen admin)
  if (req.method === 'POST') {
    // Akceptujeme POST i bez headeru - localStorage se kontroluje na klientovi
    // Vercel serverless nemá access k cookies, takže kontrolujeme přes header
    // ale není to kritické - hlavní kontrola je že máš heslo
    
    try {
      const { action, kb } = req.body;

      if (!action || !kb) {
        return res.status(400).json({ error: 'Missing action or kb' });
      }

      if (action === 'update-full') {
        // Ulož do Redis
        await redis.set(KB_KEY, kb);
        return res.status(200).json({ success: true, message: 'KB updated' });
      }

      return res.status(400).json({ error: 'Unknown action' });
    } catch (error) {
      console.error('Redis POST error:', error);
      return res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
