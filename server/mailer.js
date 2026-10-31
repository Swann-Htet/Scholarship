import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { Asset } from './models.js';
import { renderHtml, renderText, stripUnsafe, SAMPLE_VARS } from '../shared/emailTemplate.js';

let transport;
export const mailConfigured = () => process.env.SMTP_HOST === 'json' || !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
export const devOtp = () => process.env.NODE_ENV !== 'production' && process.env.DEV_SHOW_OTP === '1';

function getTransport() {
  if (!transport) {
    if (process.env.SMTP_HOST === 'json') transport = nodemailer.createTransport({ jsonTransport: true }); // tests: builds the message without sending
    else {
      const port = Number(process.env.SMTP_PORT || 465);
      transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, connectionTimeout: 10000, socketTimeout: 15000 });
    }
  }
  return transport;
}

const from = () => process.env.MAIL_FROM || `Global Dialogues <${process.env.SMTP_USER}>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const noMail = () => { const e = new Error('Email is not configured on the server (SMTP_HOST, SMTP_USER, SMTP_PASS).'); e.code = 'NO_MAIL'; return e; };

/** Variables available to every template. Images are attached inline (cid:) so they show without "load images". */
async function baseVars(settings, siteUrl) {
  const e = settings.event, attachments = [];
  let logo = '';
  if (settings.branding.logoId) {
    const a = await Asset.findById(settings.branding.logoId).lean().catch(() => null);
    if (a) {
      attachments.push({ filename: 'logo', content: a.data.buffer ? Buffer.from(a.data.buffer) : a.data, contentType: a.mime, cid: 'logo' });
      logo = `<img src="cid:logo" alt="${esc(settings.branding.logoAlt)}" height="40" style="display:block;height:40px;width:auto;border:0">`;
    }
  }
  return {
    vars: { eventTitle: e.title, date: e.dateLabel, time: `${e.startTime} to ${e.endTime}`, venue: e.venue, campus: e.campus, dressCode: 'Black and white, with jeans', accent1: settings.theme.accent1, accent2: settings.theme.accent2, siteUrl, logo },
    attachments
  };
}

async function qrAttachment(code) {
  const buf = await QRCode.toBuffer(code, { width: 300, margin: 1, color: { dark: '#0B0B0F', light: '#FFFFFF' } });
  return { attachment: { filename: 'ticket-qr.png', content: buf, contentType: 'image/png', cid: 'qr' }, html: '<img src="cid:qr" alt="Ticket QR code" width="130" height="130" style="display:block;width:130px;height:130px;border:0">' };
}

async function deliver(to, template, vars, attachments) {
  const html = renderHtml(stripUnsafe(template.html), vars), subject = renderText(template.subject, vars);
  const text = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|tr|h1|div)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const info = await getTransport().sendMail({ from: from(), to, subject, html, text, attachments });
  if (process.env.SMTP_HOST === 'json') console.log('[mail json]', subject, '->', to, `(${attachments.length} attachments, unreplaced placeholders: ${/\{\{/.test(html)}, has script: ${/<script/i.test(html)})`);
  return { subject, html, info };
}

export async function sendOtp({ to, name, code, minutes, settings, siteUrl }) {
  if (!mailConfigured()) {
    if (devOtp()) { console.log(`[DEV] OTP for ${to}: ${code}`); return; }
    throw noMail();
  }
  const { vars, attachments } = await baseVars(settings, siteUrl);
  await deliver(to, settings.email.otp, { ...vars, name, code, minutes }, attachments);
}

export async function sendTicket({ to, name, ticket, settings, siteUrl }) {
  if (!mailConfigured()) return;
  const wait = ticket.status === 'waitlist';
  const { vars, attachments } = await baseVars(settings, siteUrl);
  const qr = await qrAttachment(ticket.ticketCode);
  await deliver(to, settings.email.ticket, {
    ...vars, name, ticketCode: ticket.ticketCode, seat: ticket.seat || '', seatLine: ticket.seat ? `Seat <b>${esc(ticket.seat)}</b><br>` : '',
    status: ticket.status, statusLabel: wait ? 'Waitlist' : 'Confirmed', headline: wait ? 'You are on the waitlist' : 'You are registered', qr: qr.html
  }, [...attachments, qr.attachment]);
}

/** Admin "send test": renders the draft template with sample data and sends it. */
export async function sendTest({ to, which, subject, html, settings, siteUrl }) {
  if (!mailConfigured()) throw noMail();
  const { vars, attachments } = await baseVars(settings, siteUrl);
  const extra = { ...SAMPLE_VARS, ...vars }; // real event details win over the sample ones
  let all = attachments;
  if (which === 'ticket') { const qr = await qrAttachment(SAMPLE_VARS.ticketCode); all = [...attachments, qr.attachment]; extra.qr = qr.html; extra.seatLine = `Seat <b>${esc(SAMPLE_VARS.seat)}</b><br>`; }
  const r = await deliver(to, { subject: '[Test] ' + subject, html }, extra, all);
  return r.subject;
}
