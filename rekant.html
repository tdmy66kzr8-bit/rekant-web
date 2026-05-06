const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = 'rekant@rekant.cz';
const FROM_EMAIL = 'poptavky@rekant.cz';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (req.body.website) return res.status(200).json({ ok: true });

  const { name, email, phone, msg, interest, product } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Chybí jméno nebo e-mail.' });

  const subject = product
    ? `Poptávka stroje: ${product} — ${name}`
    : `Nová poptávka z webu — ${name}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#cc1a1a;padding:20px 24px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0;font-size:20px">📋 Nová poptávka z webu Rekant</h2>
      </div>
      <div style="background:#f9f9f9;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:140px">Jméno a firma</td><td style="padding:8px 0;font-weight:700;font-size:15px">${name}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">E-mail</td><td style="padding:8px 0;font-size:15px"><a href="mailto:${email}" style="color:#cc1a1a">${email}</a></td></tr>
          ${phone ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Telefon</td><td style="padding:8px 0;font-size:15px"><a href="tel:${phone}" style="color:#cc1a1a">${phone}</a></td></tr>` : ''}
          ${interest ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Oblast zájmu</td><td style="padding:8px 0;font-size:15px">${interest}</td></tr>` : ''}
          ${product ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Konkrétní stroj</td><td style="padding:8px 0;font-size:15px;font-weight:700;color:#cc1a1a">${product}</td></tr>` : ''}
          ${msg ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top">Zpráva</td><td style="padding:8px 0;font-size:15px">${msg.replace(/\n/g,'<br>')}</td></tr>` : ''}
        </table>
        <div style="margin-top:20px;padding:14px 16px;background:#fff3cd;border-radius:6px;font-size:13px;color:#856404">
          ⏱️ Odpovězte do 2 pracovních hodin — <a href="mailto:${email}" style="color:#cc1a1a">${email}</a>
        </div>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px">Rekant s.r.o. · rekant.cz · 244 471 760</p>
    </div>
  `;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Rekant web <${FROM_EMAIL}>`,
        to: [TO_EMAIL],
        reply_to: email,
        subject,
        html,
      }),
    });
    if (!r.ok) console.error('Resend error:', await r.json());
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact API error:', err);
    return res.status(200).json({ ok: true });
  }
}
