import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  if (req.method === "POST") {
    try {
      const news = req.body;
      await redis.set("rekant:news", news);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error("Redis SET error:", e);
      return res.status(500).json({ error: e.message });
    }
  }
  
  return res.status(405).end();
}
