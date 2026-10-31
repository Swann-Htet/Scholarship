// Email templates: placeholders like {{name}} are replaced with (escaped) values. Used by the server (sending) and the admin (live preview).

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// These placeholders are inserted as ready-made HTML (the server builds them from trusted data).
export const RAW_KEYS = new Set(['logo', 'qr', 'seatLine']);

export const PLACEHOLDERS = {
  otp: [['name', 'Person\'s name'], ['code', '6-digit code'], ['minutes', 'Minutes until it expires'], ['eventTitle', 'Event title'], ['date', 'Event date'], ['time', 'Start to end time'], ['venue', 'Venue'], ['campus', 'Campus'], ['logo', 'MFU logo image'], ['accent1', 'Accent colour 1'], ['accent2', 'Accent colour 2'], ['siteUrl', 'Website address']],
  ticket: [['name', 'Person\'s name'], ['headline', 'You are registered / on the waitlist'], ['statusLabel', 'Confirmed or Waitlist'], ['ticketCode', 'Ticket code'], ['seat', 'Seat, e.g. C7'], ['seatLine', 'Seat sentence (empty if no seat)'], ['qr', 'QR code image'], ['eventTitle', 'Event title'], ['date', 'Event date'], ['time', 'Start to end time'], ['venue', 'Venue'], ['campus', 'Campus'], ['dressCode', 'Dress code'], ['logo', 'MFU logo image'], ['accent1', 'Accent colour 1'], ['accent2', 'Accent colour 2'], ['siteUrl', 'Website address']]
};

export const renderHtml = (tpl, vars) => String(tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (!(k in vars) ? '' : RAW_KEYS.has(k) ? vars[k] : esc(vars[k])));
export const renderText = (tpl, vars) => String(tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(vars[k] ?? '')).replace(/[\r\n]+/g, ' ').trim();

/** Remove anything that can run code. Email clients ignore it anyway, but never store it. */
export const stripUnsafe = html => String(html || '')
  .replace(/<\s*(script|iframe|object|embed|form)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  .replace(/<\s*(script|iframe|object|embed|form)\b[^>]*>/gi, '')
  .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  .replace(/javascript:/gi, '');

export const SAMPLE_VARS = {
  name: 'Aye Chan', code: '482915', minutes: 10, eventTitle: 'Global Dialogues: Co-existing', date: '15 November 2026', time: '08:30 to 16:00',
  venue: 'M4U Networking Space', campus: 'Mae Fah Luang University', ticketCode: 'GDC-7K2M9Q', seat: 'C7', statusLabel: 'Confirmed', headline: 'You are registered',
  dressCode: 'Black and white, with jeans', accent1: '#FFB020', accent2: '#2DD4BF', siteUrl: 'https://example.com'
};

const shell = (inner) => `<div style="background:#f5f3ee;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1d1b26">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e8e3d8">
<tr><td style="height:6px;line-height:6px;font-size:0;background-color:{{accent1}};background-image:linear-gradient(90deg,{{accent1}},{{accent2}})">&nbsp;</td></tr>
<tr><td style="padding:26px 32px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding-right:12px">{{logo}}</td><td style="font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#6b6872;font-weight:bold">{{eventTitle}}</td></tr></table></td></tr>
${inner}
</table>
<p style="max-width:540px;margin:16px auto 0;text-align:center;color:#8a8692;font-size:12px;line-height:1.5">{{eventTitle}} · {{venue}}, {{campus}}<br>If you did not request this email you can safely ignore it.</p>
</div>`;

export const DEFAULT_EMAIL = {
  otp: {
    subject: '{{code}} is your {{eventTitle}} verification code',
    html: shell(`<tr><td style="padding:20px 32px 6px"><h1 style="margin:0 0 10px;font-size:26px;line-height:1.2">Verify your email</h1>
<p style="margin:0;font-size:16px;line-height:1.55;color:#4a4753">Hi {{name}}, enter this code on the registration page to confirm your MFU email.</p></td></tr>
<tr><td align="center" style="padding:14px 32px 14px"><div style="display:inline-block;padding:16px 26px;border-radius:14px;background:#f5f3ee;border:1px solid #e8e3d8;font-family:'Courier New',monospace;font-size:38px;letter-spacing:10px;font-weight:bold;color:#1d1b26">{{code}}</div></td></tr>
<tr><td style="padding:0 32px 30px;font-size:14px;line-height:1.55;color:#6b6872">The code expires in <b>{{minutes}} minutes</b>. For your security, never share it with anyone.</td></tr>`)
  },
  ticket: {
    subject: '{{headline}}: {{eventTitle}}',
    html: shell(`<tr><td style="padding:20px 32px 6px"><h1 style="margin:0 0 10px;font-size:26px;line-height:1.2">{{headline}}</h1>
<p style="margin:0;font-size:16px;line-height:1.55;color:#4a4753">Hi {{name}}, here is your ticket. Show the QR code at check-in.</p></td></tr>
<tr><td style="padding:16px 32px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;border-radius:14px"><tr>
<td style="padding:18px 20px;vertical-align:top;font-size:14px;line-height:1.7;color:#1d1b26"><b style="font-size:17px">{{eventTitle}}</b><br>{{date}}, {{time}}<br>{{venue}}<br>{{campus}}<br>Dress code: {{dressCode}}<br>{{seatLine}}<span style="display:inline-block;margin-top:8px;padding:3px 12px;border-radius:999px;background:#1d1b26;color:#ffffff;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase">{{statusLabel}}</span></td>
<td align="center" style="padding:14px 16px;vertical-align:middle;width:150px">{{qr}}<div style="margin-top:6px;font-family:'Courier New',monospace;font-size:14px;letter-spacing:2px;font-weight:bold">{{ticketCode}}</div></td></tr></table></td></tr>
<tr><td style="padding:12px 32px 30px;font-size:14px;line-height:1.55;color:#6b6872">Tip: save this email or take a screenshot of the QR code, so you can check in quickly.</td></tr>`)
  }
};
