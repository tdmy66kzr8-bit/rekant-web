import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  if (req.method === "GET") {
    try {
      const news = await redis.get("rekant:news");
      return res.status(200).json(news || []);
    } catch (e) {
      console.error("Redis GET error:", e);
      return res.status(200).json([]);
    }
  }
  
  return res.status(405).end();
}
