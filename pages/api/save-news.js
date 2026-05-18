import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  if (req.method === "POST") {
    try {
      const news = req.body;
      
      if (!news || !Array.isArray(news)) {
        return res.status(400).json({ error: "Invalid news data" });
      }
      
      await redis.set("rekant:news", news);
      console.log(`✅ Saved ${news.length} news items to Redis`);
      
      return res.status(200).json({ ok: true, count: news.length });
    } catch (e) {
      console.error("❌ Redis SET error:", e);
      return res.status(500).json({ error: e.message });
    }
  }
  
  return res.status(405).json({ error: "Method not allowed" });
}
