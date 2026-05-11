import fs from "fs";
import path from "path";

const KB_PATH = path.join(process.cwd(), "public", "data", "kb.json");

// Kontrola tokenu
function checkAuth(token) {
  return token === process.env.ADMIN_TOKEN;
}

// Načíst KB
function loadKB() {
  try {
    if (fs.existsSync(KB_PATH)) {
      return JSON.parse(fs.readFileSync(KB_PATH, "utf8"));
    }
  } catch (e) {
    console.error("Load KB error:", e);
  }
  return null;
}

// Uložit KB
function saveKB(kb) {
  try {
    fs.writeFileSync(KB_PATH, JSON.stringify(kb, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("Save KB error:", e);
    return false;
  }
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Kontrola tokenu
  const token = req.headers["x-admin-token"];
  if (!token || !checkAuth(token)) {
    return res.status(401).json({ error: "Neautorizovaný přístup" });
  }

  // GET - Načíst KB
  if (req.method === "GET") {
    const kb = loadKB();
    if (!kb) {
      return res.status(404).json({ error: "KB není dostupná" });
    }
    return res.status(200).json(kb);
  }

  // POST - Uložit KB
  if (req.method === "POST") {
    const { action, kb, q, a, index } = req.body;

    if (!action) {
      return res.status(400).json({ error: "Chybí action" });
    }

    const currentKB = loadKB();
    if (!currentKB) {
      return res.status(500).json({ error: "KB je poškozená" });
    }

    try {
      if (action === "update-full") {
        // Uložit celou KB
        if (!kb) {
          return res.status(400).json({ error: "Chybí kb data" });
        }
        if (saveKB(kb)) {
          return res.status(200).json({ success: true, message: "KB uložena" });
        }
      }

      if (action === "add-faq") {
        // Přidat FAQ
        if (!q || !a) {
          return res.status(400).json({ error: "Chybí otázka nebo odpověď" });
        }
        if (!currentKB.faq) currentKB.faq = [];
        currentKB.faq.push({ q, a });
        if (saveKB(currentKB)) {
          return res.status(200).json({ success: true, message: "FAQ přidáno" });
        }
      }

      if (action === "delete-faq") {
        // Smazat FAQ
        if (index === undefined) {
          return res.status(400).json({ error: "Chybí index" });
        }
        if (currentKB.faq && currentKB.faq[index]) {
          currentKB.faq.splice(index, 1);
          if (saveKB(currentKB)) {
            return res.status(200).json({ success: true, message: "FAQ smazáno" });
          }
        }
      }

      if (action === "update-company-info") {
        // Aktualizovat info firmy
        if (!kb?.company) {
          return res.status(400).json({ error: "Chybí company data" });
        }
        currentKB.company = { ...currentKB.company, ...kb.company };
        if (saveKB(currentKB)) {
          return res.status(200).json({ success: true, message: "Firma aktualizována" });
        }
      }

      return res.status(400).json({ error: "Neznámá action" });
    } catch (e) {
      console.error("KB update error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Metoda není povolena" });
}
