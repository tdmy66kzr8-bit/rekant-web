// pages/api/save-news.js
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const newsData = req.body;
    
    // Ulož do Redis
    await kv.set('rekant:news', JSON.stringify(newsData));
    
    res.status(200).json({ success: true, message: 'News saved to Redis' });
  } catch (error) {
    console.error('Error saving news:', error);
    res.status(500).json({ error: error.message });
  }
}
