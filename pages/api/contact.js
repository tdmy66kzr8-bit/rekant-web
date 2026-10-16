// pages/api/contact.js
// Příjem poptávek a servisních požadavků z formulářů na webu -> e-mail přes Resend.
//
// Potřebné proměnné prostředí ve Vercelu (Settings -> Environment Variables):
//   RESEND_API_KEY   – klíč z resend.com (doména rekant.cz musí být v Resendu ověřená)
//   CONTACT_TO       – volitelné, příjemce (výchozí rekant@rekant.cz), více adres oddělit čárkou
//   CONTACT_FROM     – volitelné, odesílatel (výchozí "Web Rekant <poptavky@rekant.cz>")
//   KV_REST_API_URL / KV_REST_API_TOKEN – už existují (Upstash), použijí se na rate-limit

import { Redis } from '@upstash/redis';

const TYPES = {
  servis: 'Servisní požadavek',
  mfp: 'Poptávka – multifunkce (koupě / pronájem)',
  alarm: 'Poptávka – alarm & kamery',
  obecne: 'Obecný dotaz',
};

const RATE_LIMIT = 5;          // max odeslání
const RATE_WINDOW = 60 * 60;   // za hodinu na IP

let redis = null;
try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
  }
} catch (e) { redis = null; }

const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => String(s || '').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const b = req.body || {};

  // Honeypot – pokud je vyplněné skryté pole, tváříme se jako úspěch a nic neposíláme
  if (b.website || b.hp) return res.status(200).json({ ok: true });

  const data = {
    type: clip(b.type, 20),
    name: clip(b.name, 120),
    email: clip(b.email, 160),
    phone: clip(b.phone, 40),
    msg: clip(b.msg, 5000),
    interest: clip(b.interest, 120),
    product: clip(b.product, 200),
  };

  if (!data.name || (!data.email && !data.phone)) {
    return res.status(400).json({ ok: false, error: 'Vyplňte jméno a e-mail nebo telefon.' });
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return res.status(400).json({ ok: false, error: 'Neplatný e-mail.' });
  }

  // Serverový rate-limit (při výpadku Redisu se nepoužije, formulář nesmí kvůli tomu padat)
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (redis) {
    try {
      const key = `rekant:contact:rl:${ip}`;
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, RATE_WINDOW);
      if (n > RATE_LIMIT) {
        return res.status(429).json({ ok: false, error: 'Příliš mnoho odeslání, zkuste to později nebo zavolejte 244 471 760.' });
      }
    } catch (e) {
      console.error('contact rate-limit error:', e);
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('contact: chybí RESEND_API_KEY');
    return res.status(500).json({ ok: false, error: 'E-mail není nakonfigurován.' });
  }

  const typeLabel = TYPES[data.type] || 'Poptávka z webu';
  const subject = `${typeLabel}: ${data.name}${data.product ? ' – ' + data.product : ''}`;

  const rows = [
    ['Typ', typeLabel],
    ['Jméno / firma', data.name],
    ['E-mail', data.email],
    ['Telefon', data.phone],
    ['Typ zařízení / zájem', data.interest],
    ['Produkt', data.product],
  ].filter(([, v]) => v);

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#222">
      <h2 style="color:#CC1A1A;margin:0 0 12px">${esc(typeLabel)}</h2>
      <table cellpadding="6" style="border-collapse:collapse">
        ${rows.map(([k, v]) => `<tr><td style="color:#666;vertical-align:top">${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join('')}
      </table>
      <h3 style="margin:16px 0 6px">Zpráva</h3>
      <div style="white-space:pre-wrap;background:#f5f5f5;padding:10px;border-radius:6px">${esc(data.msg) || '<i>(bez textu)</i>'}</div>
      <p style="color:#999;font-size:12px;margin-top:16px">Odesláno z webu rekant.cz · IP ${esc(ip)} · ${new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' })}</p>
    </div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nZpráva:\n${data.msg || '(bez textu)'}`;

  const to = (process.env.CONTACT_TO || 'rekant@rekant.cz').split(',').map((s) => s.trim()).filter(Boolean);
  const from = process.env.CONTACT_FROM || 'Web Rekant <poptavky@rekant.cz>';

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        text,
        ...(data.email ? { reply_to: data.email } : {}),
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      console.error('Resend error', r.status, err);
      return res.status(502).json({ ok: false, error: 'Odeslání e-mailu selhalo.' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('contact send error:', e);
    return res.status(502).json({ ok: false, error: 'Odeslání e-mailu selhalo.' });
  }
}
