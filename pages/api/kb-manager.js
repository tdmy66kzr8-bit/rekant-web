import fs from "fs";
import path from "path";

const KB_PATH = path.join(process.cwd(), "public", "data", "kb.json");

function checkAuth(token) {
  return token === process.env.ADMIN_TOKEN;
}

function loadKB() {
  try {
    if (fs.existsSync(KB_PATH)) {
      return JSON.parse(fs.readFileSync(KB_PATH, "utf-8"));
    }
  } catch (e) {
    console.error("Load KB error:", e.message);
  }
  return null;
}

function saveKB(kb) {
  try {
    // Pokus o zápis - na Vercelu nefunguje, ale můžeme zkusit
    fs.writeFileSync(KB_PATH, JSON.stringify(kb, null, 2), "utf-8");
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const token = req.headers["x-admin-token"];
  if (!checkAuth(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // GET - vrátit aktuální KB
  if (req.method === "GET") {
    const kb = loadKB();
    if (!kb) {
      return res.status(404).json({ error: "KB nenalezena" });
    }
    return res.status(200).json(kb);
  }

  // POST - aktualizace
  if (req.method === "POST") {
    const { action, kb: newKB, q, a, index } = req.body;

    if (!action) {
      return res.status(400).json({ error: "Chybí action" });
    }

    const currentKB = loadKB() || {};

    try {
      // UPDATE-FULL - kompletní nahrazení KB
      if (action === "update-full") {
        if (!newKB) {
          return res.status(400).json({ error: "Chybí kb data" });
        }
        const result = saveKB(newKB);
        if (result.success) {
          return res.status(200).json({ success: true, message: "KB aktualizována" });
        } else {
          // Vercel - vrátíme data klientovi
          return res.status(200).json({
            success: true,
            method: "client-side-storage",
            message: "Na Vercelu nelze zapisovat. Použij export.",
            kb: newKB,
          });
        }
      }

      // ADD-FAQ
      if (action === "add-faq") {
        if (!q || !a) {
          return res.status(400).json({ error: "Chybí q nebo a" });
        }
        if (!currentKB.faq) currentKB.faq = [];
        currentKB.faq.push({ q, a });
        const result = saveKB(currentKB);
        return res.status(200).json({
          success: true,
          message: "FAQ přidáno",
          method: result.success ? "filesystem" : "memory",
        });
      }

      // DELETE-FAQ
      if (action === "delete-faq") {
        if (index === undefined) {
          return res.status(400).json({ error: "Chybí index" });
        }
        if (currentKB.faq && currentKB.faq[index] !== undefined) {
          currentKB.faq.splice(index, 1);
          const result = saveKB(currentKB);
          return res.status(200).json({
            success: true,
            message: "FAQ smazáno",
            method: result.success ? "filesystem" : "memory",
          });
        }
        return res.status(404).json({ error: "FAQ nenalezena" });
      }

      return res.status(400).json({ error: "Neznámá action" });
    } catch (e) {
      console.error("KB Manager error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
