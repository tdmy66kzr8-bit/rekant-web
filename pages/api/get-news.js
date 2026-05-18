import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const DEFAULT_NEWS = [
  {
    id: 1715904000000,
    title: "Nová řada Konica Minolta bizhub i-Series – nyní u Rekant",
    perex: "Uvádíme nejnovější generaci multifunkční bizhub i-Series s pokročilým zabezpečením.",
    body: "Nejnovější řada bizhub i-Series — prodej, pronájem, servis. Záruka 24-48 měsíců, servis do 24 pracovních hodin.",
    cat: "Novinka",
    date: "2026-03-15",
    author: "Rekant dispečink"
  },
  {
    id: 1709251200000,
    title: "Jablotron 100+ – jarní akce: 15 % sleva na instalaci",
    perex: "Do konce dubna 15 % sleva na instalaci alarmového systému Jablotron 100+.",
    body: "Nabízíme instalaci bezpečnostního systému Jablotron 100+ se slevou 15 % do konce dubna 2026.",
    cat: "Akce",
    date: "2026-03-01",
    author: "Jan Honc"
  },
  {
    id: 1708473600000,
    title: "Epson WorkForce Pro – užitečnete až 50 % nákladů na tisk",
    perex: "Inkoustová tiskárna Epson WorkForce Pro může užitečit až 50 % oproti laserům.",
    body: "Nové tiskárny Epson WorkForce Pro s ultraekonomickou spotřebou inkoustu.",
    cat: "Tip",
    date: "2026-02-20",
    author: "Rekant tým"
  }
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  if (req.method === "GET") {
    try {
      const news = await redis.get("rekant:news");
      
      // Pokud nejsou novinky v Redis, vrátit DEFAULT
      if (!news || (Array.isArray(news) && news.length === 0)) {
        return res.status(200).json(DEFAULT_NEWS);
      }
      
      return res.status(200).json(news);
    } catch (e) {
      console.error("Redis GET error:", e);
      // Fallback na default novinky při chybě
      return res.status(200).json(DEFAULT_NEWS);
    }
  }
  
  return res.status(405).end();
}
