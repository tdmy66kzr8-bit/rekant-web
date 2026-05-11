// pages/api/kb-manager.js
import fs from "fs";
import path from "path";

// Knowledge base se uloží do souboru pro perzistenci mezi deployy
const KB_FILE = path.join(process.cwd(), "public", "data", "kb.json");

// Inicializace souboru pokud neexistuje
function initKBFile() {
  if (!fs.existsSync(KB_FILE)) {
    const defaultKB = {
      company: {
        name: "Rekant s.r.o.",
        address: "Severozápadní I. 285/8, Praha 4 – Spořilov",
        phone: "244 471 760",
        phone_shop: "777 041 813",
        phone_service: "777 613 044",
        email: "rekant@rekant.cz",
      },
      products: {},
      faq: [],
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(KB_FILE, JSON.stringify(defaultKB, null, 2));
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Ověření admin tokenu
  const adminToken = req.headers["x-admin-token"];
  const validToken = process.env.ADMIN_TOKEN || "admin123"; // Měnit v .env.local!

  if (adminToken !== validToken) {
    return res.status(403).json({ error: "Neautorizováno. Chybný token." });
  }

  initKBFile();

  // GET: Stáhnout aktuální KB
  if (req.method === "GET") {
    try {
      const kb = JSON.parse(fs.readFileSync(KB_FILE, "utf8"));
      return res.status(200).json(kb);
    } catch (e) {
      return res.status(500).json({ error: "Chyba při čtení KB: " + e.message });
    }
  }

  // POST: Aktualizovat KB
  if (req.method === "POST") {
    try {
      const { action, data } = req.body;

      if (action === "update-full") {
        // Nahradit celou KB
        if (!data) return res.status(400).json({ error: "Chybí data" });
        data.lastUpdated = new Date().toISOString();
        fs.writeFileSync(KB_FILE, JSON.stringify(data, null, 2));
        return res.status(200).json({ 
          success: true, 
          message: "Knowledge base aktualizována",
          kb: data 
        });
      }

      if (action === "add-product") {
        // Přidat nebo aktualizovat produkt
        const { productKey, productData } = data;
        if (!productKey || !productData) {
          return res.status(400).json({ error: "Chybí productKey nebo productData" });
        }
        const kb = JSON.parse(fs.readFileSync(KB_FILE, "utf8"));
        kb.products[productKey] = productData;
        kb.lastUpdated = new Date().toISOString();
        fs.writeFileSync(KB_FILE, JSON.stringify(kb, null, 2));
        return res.status(200).json({ 
          success: true, 
          message: `Produkt '${productKey}' uložen`,
          kb 
        });
      }

      if (action === "add-faq") {
        // Přidat FAQ
        const { question, answer } = data;
        if (!question || !answer) {
          return res.status(400).json({ error: "Chybí question nebo answer" });
        }
        const kb = JSON.parse(fs.readFileSync(KB_FILE, "utf8"));
        kb.faq.push({ q: question, a: answer });
        kb.lastUpdated = new Date().toISOString();
        fs.writeFileSync(KB_FILE, JSON.stringify(kb, null, 2));
        return res.status(200).json({ 
          success: true, 
          message: "FAQ přidáno",
          kb 
        });
      }

      if (action === "delete-faq") {
        // Smazat FAQ
        const { index } = data;
        if (index === undefined) {
          return res.status(400).json({ error: "Chybí index" });
        }
        const kb = JSON.parse(fs.readFileSync(KB_FILE, "utf8"));
        kb.faq.splice(index, 1);
        kb.lastUpdated = new Date().toISOString();
        fs.writeFileSync(KB_FILE, JSON.stringify(kb, null, 2));
        return res.status(200).json({ 
          success: true, 
          message: "FAQ smazáno",
          kb 
        });
      }

      if (action === "update-company-info") {
        // Aktualizovat info o firmě
        const { companyData } = data;
        if (!companyData) {
          return res.status(400).json({ error: "Chybí companyData" });
        }
        const kb = JSON.parse(fs.readFileSync(KB_FILE, "utf8"));
        kb.company = { ...kb.company, ...companyData };
        kb.lastUpdated = new Date().toISOString();
        fs.writeFileSync(KB_FILE, JSON.stringify(kb, null, 2));
        return res.status(200).json({ 
          success: true, 
          message: "Info o firmě aktualizováno",
          kb 
        });
      }

      return res.status(400).json({ error: "Neznámá akce" });
    } catch (e) {
      return res.status(500).json({ error: "Chyba: " + e.message });
    }
  }

  res.status(405).json({ error: "Metoda není podporovaná" });
}
