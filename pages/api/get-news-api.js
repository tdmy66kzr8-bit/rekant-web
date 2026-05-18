// pages/api/get-news.js
import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Pokus se načíst z Redis
    const redisData = await kv.get('rekant:news');
    if (redisData) {
      return res.status(200).json(JSON.parse(redisData));
    }

    // Fallback: Načti z ./public/data/news.json
    const filePath = path.join(process.cwd(), 'public', 'data', 'news.json');
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      return res.status(200).json(JSON.parse(fileData));
    }

    // Pokud nic neexistuje, vrať prázdné pole
    return res.status(200).json([]);
  } catch (error) {
    console.error('Error getting news:', error);
    res.status(500).json({ error: error.message });
  }
}
