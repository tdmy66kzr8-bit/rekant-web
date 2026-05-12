import { Redis } from "@upstash/redis";
import fs from "fs";
import path from "path";

const redis = Redis.fromEnv();
const KB_KEY = "rekant:kb";

function checkAuth(token) {
  return token === process.env.ADMIN_TOKEN;
}

// Načti KB - PRIORITNĚ z Redis, fallback ze souboru
async function loadKB() {
  // 1. Zkus Redis (databáze)
  try {
    const dbKB = await redis.get(KB_KEY);
    if (dbKB) {
      return dbKB;
    }
  } catch (e) {
    console.error("Redis load error:", e.message);
  }

  // 2. Fallback: načti ze souboru
  try {
    const filePath = path.join(process.cwd(), "public", "data", "kb.json");
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const fileKB = JSON.parse(content);
      
      // Při prvním načtení ulož do Redis
      try {
        await redis.set(KB_KEY, fileKB);
        console.log("Initialized Redis from file");
      } catch (e) {
        console.warn("Cannot initialize Redis:", e.message);
      }
      
      return fileKB;
    }
  } catch (e) {
    console.error("File load error:", e.message);
  }

  return null;
}

// Ulož KB do Redis
async function saveKB(kb) {
  try {
    await redis.set(KB_KEY, kb);
    return { success: true };
  } catch (e) {
    console.error("Redis save error:", e.message);
    return { success: false, error: e.message };
  }
}

export default async function handler(req, res) {
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
    const kb = await loadKB();
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

    const currentKB = (await loadKB()) || {};

    try {
      // UPDATE-FULL
      if (action === "update-full") {
        if (!newKB) {
          return res.status(400).json({ error: "Chybí kb data" });
        }
        const result = await saveKB(newKB);
        if (result.success) {
          return res.status(200).json({
            success: true,
            message: "KB uložena do databáze",
            storage: "upstash-redis",
          });
        } else {
          return res.status(500).json({
            error: "Chyba ukládání",
            details: result.error,
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
        const result = await saveKB(currentKB);
        return res.status(200).json({
          success: result.success,
          message: result.success ? "FAQ přidáno" : "Chyba ukládání",
        });
      }

      // DELETE-FAQ
      if (action === "delete-faq") {
        if (index === undefined) {
          return res.status(400).json({ error: "Chybí index" });
        }
        if (currentKB.faq && currentKB.faq[index] !== undefined) {
          currentKB.faq.splice(index, 1);
          const result = await saveKB(currentKB);
          return res.status(200).json({
            success: result.success,
            message: result.success ? "FAQ smazáno" : "Chyba ukládání",
          });
        }
        return res.status(404).json({ error: "FAQ nenalezena" });
      }

      // RESET - smaž Redis a načti znovu ze souboru
      if (action === "reset") {
        try {
          await redis.del(KB_KEY);
          const kb = await loadKB();
          return res.status(200).json({
            success: true,
            message: "KB resetována na výchozí (ze souboru)",
            kb,
          });
        } catch (e) {
          return res.status(500).json({ error: e.message });
        }
      }

      return res.status(400).json({ error: "Neznámá action" });
    } catch (e) {
      console.error("KB Manager error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
