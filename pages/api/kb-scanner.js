import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const KB_KEY = 'rekant:kb';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch aktuální KB z Redis
    let currentKB = await redis.get(KB_KEY);
    if (!currentKB) {
      return res.status(400).json({ error: 'KB not found in database' });
    }

    // Fetch rekant.html z webu
    console.log('Fetching www.rekant.cz...');
    const htmlRes = await fetch('https://www.rekant.cz/rekant.html');
    if (!htmlRes.ok) {
      return res.status(400).json({ error: 'Failed to fetch website' });
    }
    const html = await htmlRes.text();

    // Parsuj HTML a extrahuj novinky
    const newsRegex = /<div[^>]*class="[^"]*news-item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const titleRegex = /<h[3-4][^>]*>(.*?)<\/h[3-4]>/i;
    const descRegex = /<p[^>]*>(.*?)<\/p>/i;
    const dateRegex = /(\d{4}-\d{2}-\d{2})/;
    const tagRegex = /<span[^>]*class="[^"]*tag[^"]*"[^>]*>(.*?)<\/span>/i;

    const extractedNews = [];
    let match;
    while ((match = newsRegex.exec(html)) !== null) {
      const newsHtml = match[1];
      
      const titleMatch = titleRegex.exec(newsHtml);
      const descMatch = descRegex.exec(newsHtml);
      const dateMatch = dateRegex.exec(newsHtml);
      const tagMatch = tagRegex.exec(newsHtml);

      if (titleMatch && descMatch) {
        extractedNews.push({
          id: Date.now().toString() + Math.random(),
          title: titleMatch[1].trim().replace(/<[^>]*>/g, ''),
          description: descMatch[1].trim().replace(/<[^>]*>/g, ''),
          tag: tagMatch ? tagMatch[1].trim() : 'Novinka',
          author: 'Rekant',
          date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
        });
      }
    }

    console.log(`Extracted ${extractedNews.length} news items from website`);

    // Aktualizuj KB s novými novinkami, ale zachovej company sekcí!
    const updatedKB = {
      ...currentKB,
      news: extractedNews.length > 0 ? extractedNews : (currentKB.news || []),
      // ZACHOVEJ company - nikdy ji neoverwrite!
      company: currentKB.company,
    };

    // Ulož do Redis
    await redis.set(KB_KEY, updatedKB);
    console.log('KB updated with scanned news');

    return res.status(200).json({
      success: true,
      kb: updatedKB,
      message: `Scanned ${extractedNews.length} news items from website`,
      extracted: extractedNews.length,
    });

  } catch (error) {
    console.error('Scanner error:', error);
    return res.status(500).json({
      error: 'Scanner failed',
      details: error.message,
    });
  }
}
