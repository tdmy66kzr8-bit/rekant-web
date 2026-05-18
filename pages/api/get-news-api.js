// pages/api/get-news.js
// JEDNODUCHÁ verze - bez @vercel/kv

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Zkus načíst z /public/data/news.json
    const response = await fetch('https://www.rekant.cz/data/news.json');
    
    if (response.ok) {
      const data = await response.json();
      return res.status(200).json(data);
    }

    // Fallback - vrať prázdné pole
    return res.status(200).json([]);
  } catch (error) {
    console.error('Error:', error);
    // Vrať prázdné pole místo chyby
    res.status(200).json([]);
  }
}
