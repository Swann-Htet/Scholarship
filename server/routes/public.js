import { Router } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Registration, Pending, CheckinLink } from '../models.js';
import { getSettings } from '../settings.js';
import { seatLabels, seatOrder } from '../../shared/seats.js';
import { hit, blockIp, strike, rejectBlocked, blockBody, sha256, secret, clientIp, wrap, LOCK_MINUTES } from '../security.js';
import { sendOtp, sendTicket, devOtp } from '../mailer.js';
import { Asset } from '../models.js';
import { checkIn } from '../checkin.js';

const router = Router();
const MIN = 60 * 1000;
const OTP_MINUTES = 10, RESEND_SECONDS = 45, MAX_ATTEMPTS = 5;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LINE = /^[A-Za-z0-9._-]{2,40}$/;
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () => 'GDC-' + Array.from(crypto.randomBytes(6), b => ALPHABET[b % ALPHABET.length]).join('');
const siteUrl = req => process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
const fail = (res, status, error, extra = {}) => res.status(status).json({ ok: false, error, ...extra });

// "aye+test@lamduan.mfu.ac.th" and "aye@lamduan.mfu.ac.th" are the same mailbox: only one registration per mailbox.
const emailKeyOf = e => { const [l, d] = e.split('@'); return l.split('+')[0] + '@' + d; };
const mask = e => { const [l, d] = e.split('@'); return l.slice(0, 2) + '*'.repeat(Math.max(1, l.length - 2)) + '@' + d; };
const otpHash = (code, key) => sha256(`${code}:${key}:${secret()}`);

async function takenSeats(exceptEmail) {
  const [reg, pend] = await Promise.all([Registration.distinct('seat', { seat: { $exists: true, $ne: null } }), Pending.distinct('seat', { seat: { $ne: null }, email: { $ne: exceptEmail || '' }, expiresAt: { $gt: new Date() } })]);
  return new Set([...reg, ...pend]);
}

// ---------------- read-only public data ----------------
router.get('/settings', wrap(async (_req, res) => {
  const { email, ...publicSettings } = await getSettings(); // email templates are admin-only
  res.set('Cache-Control', 'no-store'); res.json(publicSettings);
}));

// uploaded images (logo, people photos)
router.get('/asset/:id', wrap(async (req, res) => {
  if (!/^[a-f0-9]{24}$/.test(req.params.id)) return res.status(404).end();
  const a = await Asset.findById(req.params.id).lean();
  if (!a) return res.status(404).end();
  res.set({ 'Content-Type': a.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'Cross-Origin-Resource-Policy': 'cross-origin', 'Content-Security-Policy': "default-src 'none'; sandbox" });
  res.send(Buffer.from(a.data.buffer || a.data));
}));

router.get('/capacity', wrap(async (_req, res) => {
  const [settings, confirmed] = await Promise.all([getSettings(), Registration.countDocuments({ status: 'confirmed' })]);
  res.set('Cache-Control', 'no-store');
  res.json({ confirmed, capacity: settings.event.capacity });
}));

router.get('/seats', wrap(async (_req, res) => {
  const s = await getSettings();
  const taken = [...(await takenSeats())];
  res.set('Cache-Control', 'no-store');
  res.json({ capacity: s.event.capacity, cols: s.registration.seatCols, taken });
}));

// A signed, time-stamped token proves the form was really loaded and filled in by a person (bots that post directly have none).
router.get('/register/token', rejectBlocked, wrap(async (_req, res) => {
  if (!secret()) return fail(res, 500, 'Server is not configured (JWT_SECRET).');
  res.json({ token: jwt.sign({ t: Date.now() }, secret(), { expiresIn: '2h' }) });
}));

// ---------------- step 1: validate, then email a 6-digit code ----------------
router.post('/register/start', rejectBlocked, wrap(async (req, res) => {
  const b = req.body || {};
  if (b.website) { const k = await blockIp(req, 'bot: honeypot field filled'); return res.status(429).json(blockBody(k)); }

  // form token: must exist, be valid and be at least 3 seconds old
  let tokenOk = false;
  try { const p = jwt.verify(String(b.token || ''), secret()); tokenOk = Date.now() - p.t >= 3000; } catch { /* invalid */ }
  if (!tokenOk) { const k = await strike(req, 'bot: form submitted without a valid or too-fast token', 2); if (k) return res.status(429).json(blockBody(k)); return fail(res, 400, 'Please wait a moment and try again.', { reload: true }); }

  if (await hit('start:' + clientIp(req), 15 * MIN) > 60) { const k = await blockIp(req, 'too many registration attempts'); return res.status(429).json(blockBody(k)); }

  const settings = await getSettings();
  const name = String(b.name || '').trim(), email = String(b.email || '').trim().toLowerCase(), lineId = String(b.lineId || '').trim().replace(/^@/, '');
  if (name.length < 2 || name.length > 80) return fail(res, 400, 'Please enter your full name.');
  if (/https?:|www\.|\.(com|net|org|ru|xyz|top)\b/i.test(name + ' ' + lineId) || (name.replace(/\D/g, '').length > name.length / 2)) { const k = await blockIp(req, 'scam: link or spam text in the form'); return res.status(429).json(blockBody(k)); }
  if (!EMAIL.test(email) || email.length > 120) return fail(res, 400, 'Enter a valid email address.');
  if (!LINE.test(lineId)) return fail(res, 400, 'LINE ID can use letters, numbers, dot, dash and underscore (2 to 40 characters).');

  const domain = email.split('@')[1];
  if (!settings.registration.allowedDomains.includes(domain)) {
    const k = await strike(req, 'used a non-MFU email address repeatedly', 1, 15, 'domain');
    if (k) return res.status(429).json(blockBody(k));
    return fail(res, 400, `Please use your MFU email (${settings.registration.allowedDomains.map(d => '@' + d).join(' or ')}).`);
  }

  const emailKey = emailKeyOf(email), lineIdKey = lineId.toLowerCase();
  if (await Registration.exists({ $or: [{ email }, { emailKey }, { lineIdKey }] })) return fail(res, 409, 'This MFU email or LINE ID is already registered. Each email can register once.');

  // resend rules
  const existing = await Pending.findOne({ email });
  if (existing?.lastSentAt) {
    const wait = RESEND_SECONDS - Math.floor((Date.now() - existing.lastSentAt.getTime()) / 1000);
    if (wait > 0) return fail(res, 429, `Please wait ${wait} seconds before requesting another code.`, { retryAfter: wait });
  }
  if (await hit('otp:' + emailKey, 15 * MIN) > 5) { const k = await blockIp(req, 'requested too many verification codes'); return res.status(429).json(blockBody(k)); }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await Pending.findOneAndUpdate({ email }, { email, emailKey, name, lineId, seat: null, otpHash: otpHash(code, emailKey), attempts: 0, lastSentAt: new Date(), ip: clientIp(req), userAgent: String(req.headers['user-agent'] || '').slice(0, 200), expiresAt: new Date(Date.now() + OTP_MINUTES * MIN) }, { upsert: true });
  try { await sendOtp({ to: email, name, code, minutes: OTP_MINUTES, settings, siteUrl: siteUrl(req) }); }
  catch (e) {
    await Pending.deleteOne({ email });
    console.error('Email failed:', e.message);
    return fail(res, 503, e.code === 'NO_MAIL' ? 'Email sending is not set up yet. Please tell the organisers.' : 'We could not send the email. Check the address and try again.');
  }
  res.json({ ok: true, emailMasked: mask(email), expiresMinutes: OTP_MINUTES, resendIn: RESEND_SECONDS, ...(devOtp() ? { devCode: code } : {}) });
}));

// ---------------- step 2: check the code and issue the ticket ----------------
router.post('/register/verify', rejectBlocked, wrap(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase(), code = String(req.body?.code || '').replace(/\D/g, '');
  if (!EMAIL.test(email) || code.length !== 6) return fail(res, 400, 'Enter the 6-digit code from your email.');
  if (await hit('verify:' + clientIp(req), 15 * MIN) > 120) { const k = await blockIp(req, 'too many verification attempts'); return res.status(429).json(blockBody(k)); }

  const p = await Pending.findOne({ email });
  if (!p) return fail(res, 400, 'That code has expired. Please request a new one.', { expired: true });
  if (p.attempts >= MAX_ATTEMPTS) { await Pending.deleteOne({ email }); const k = await blockIp(req, 'guessing verification codes'); return res.status(429).json(blockBody(k)); }

  const good = crypto.timingSafeEqual(Buffer.from(otpHash(code, p.emailKey)), Buffer.from(p.otpHash));
  if (!good) {
    p.attempts += 1; await p.save();
    const left = MAX_ATTEMPTS - p.attempts;
    if (left <= 0) { await Pending.deleteOne({ email }); const k = await blockIp(req, 'guessing verification codes'); return res.status(429).json(blockBody(k)); }
    return fail(res, 400, `Wrong code. ${left} ${left === 1 ? 'try' : 'tries'} left.`, { attemptsLeft: left });
  }

  const settings = await getSettings();
  const lineIdKey = p.lineId.toLowerCase();
  if (await Registration.exists({ $or: [{ email }, { emailKey: p.emailKey }, { lineIdKey }] })) { await Pending.deleteOne({ email }); return fail(res, 409, 'This MFU email or LINE ID is already registered.'); }
  const confirmed = await Registration.countDocuments({ status: 'confirmed' });
  const status = confirmed >= settings.event.capacity ? 'waitlist' : 'confirmed';
  const order = seatOrder(settings.event.capacity, settings.registration.seatCols);

  for (let attempt = 0; attempt < 6; attempt++) {
    let seat;
    if (status === 'confirmed') {
      const taken = await takenSeats(email);
      seat = order.find(l => !taken.has(l)); // front row first, from the middle outwards
    }
    try {
      const doc = await Registration.create({ name: p.name, email, emailKey: p.emailKey, emailVerified: true, lineId: p.lineId, lineIdKey, status, ticketCode: newCode(), ip: clientIp(req), ...(seat ? { seat } : {}) });
      await Pending.deleteOne({ email });
      const ticket = { name: doc.name, ticketCode: doc.ticketCode, status: doc.status, seat: doc.seat || null };
      sendTicket({ to: email, name: doc.name, ticket, settings, siteUrl: siteUrl(req) }).catch(e => console.error('Ticket email failed:', e.message));
      return res.status(201).json({ ok: true, ...ticket });
    } catch (e) {
      if (e.code === 11000) {
        const key = Object.keys(e.keyPattern || {})[0];
        if (key === 'ticketCode' || key === 'seat') continue; // someone took that seat first: pick the next free one
        return fail(res, 409, 'This MFU email or LINE ID is already registered.');
      }
      throw e;
    }
  }
  fail(res, 500, 'Could not create your ticket. Please try again.');
}));

// the visitor's saved ticket asks for its current seat (an admin may have moved it)
router.get('/ticket/:code', rejectBlocked, wrap(async (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  if (!/^GDC-[A-Z0-9]{6}$/.test(code)) return fail(res, 404, 'Ticket not found.');
  if (await hit('ticket:' + clientIp(req), 15 * MIN) > 120) return fail(res, 429, 'Too many requests.');
  const r = await Registration.findOne({ ticketCode: code }).select('name seat status').lean();
  if (!r) return fail(res, 404, 'Ticket not found.');
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, name: r.name, seat: r.seat || null, status: r.status });
}));

// ---------------- check-in by shared link (for volunteers, no login) ----------------
async function linkFor(token) {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(String(token || ''))) return null;
  const l = await CheckinLink.findOne({ tokenHash: sha256(token), revoked: false, expiresAt: { $gt: new Date() } });
  return l;
}

router.post('/checkin/info', rejectBlocked, wrap(async (req, res) => {
  const l = await linkFor(req.body?.token);
  if (!l) { const k = await strike(req, 'invalid check-in link', 1); if (k) return res.status(429).json(blockBody(k)); return fail(res, 404, 'This check-in link is invalid, expired or has been switched off.'); }
  res.json({ ok: true, label: l.label, expiresAt: l.expiresAt });
}));

router.post('/checkin/scan', rejectBlocked, wrap(async (req, res) => {
  const l = await linkFor(req.body?.token);
  if (!l) return fail(res, 404, 'This check-in link is invalid, expired or has been switched off.');
  if (await hit('scan:' + l.id, MIN) > 120) return fail(res, 429, 'Too many scans. Wait a moment.');
  const r = await checkIn(req.body?.code, l.label || 'check-in link');
  if (r.ok) { l.uses += 1; l.lastUsedAt = new Date(); await l.save(); }
  res.json(r);
}));

export default router;
