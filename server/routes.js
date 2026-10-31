import { Router } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { Registration } from './models.js';
import { getSettings, saveSettings } from './settings.js';

const publicRouter = Router();
const adminRouter = Router();

// ---------------- helpers ----------------
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LINE = /^[A-Za-z0-9._-]{2,40}$/;
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () => 'GDC-' + Array.from(crypto.randomBytes(6), b => ALPHABET[b % ALPHABET.length]).join('');
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------------- public ----------------
publicRouter.get('/settings', wrap(async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await getSettings());
}));

publicRouter.get('/capacity', wrap(async (_req, res) => {
  const [settings, confirmed] = await Promise.all([getSettings(), Registration.countDocuments({ status: 'confirmed' })]);
  res.set('Cache-Control', 'no-store');
  res.json({ confirmed, capacity: settings.event.capacity });
}));

const registerLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Too many attempts. Please try again later.' } });

publicRouter.post('/register', registerLimit, wrap(async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.status(400).json({ ok: false, error: 'Rejected.' }); // honeypot
  const name = String(b.name || '').trim(), email = String(b.email || '').trim().toLowerCase(), lineId = String(b.lineId || '').trim().replace(/^@/, '');
  if (name.length < 2 || name.length > 80) return res.status(400).json({ ok: false, error: 'Please enter your full name.' });
  if (!EMAIL.test(email) || email.length > 120) return res.status(400).json({ ok: false, error: 'Enter a valid email address.' });
  if (!LINE.test(lineId)) return res.status(400).json({ ok: false, error: 'LINE ID can use letters, numbers, dot, dash and underscore (2 to 40 characters).' });

  const lineIdKey = lineId.toLowerCase();
  if (await Registration.exists({ $or: [{ email }, { lineIdKey }] })) {
    return res.status(409).json({ ok: false, error: 'This email or LINE ID is already registered.' });
  }
  const settings = await getSettings();
  const confirmed = await Registration.countDocuments({ status: 'confirmed' });
  const status = confirmed >= settings.event.capacity ? 'waitlist' : 'confirmed';

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const doc = await Registration.create({ name, email, lineId, lineIdKey, status, ticketCode: newCode() });
      return res.status(201).json({ ok: true, status: doc.status, ticketCode: doc.ticketCode, name: doc.name });
    } catch (e) {
      if (e.code === 11000 && e.keyPattern?.ticketCode) continue; // astronomically rare code clash: try again
      if (e.code === 11000) return res.status(409).json({ ok: false, error: 'This email or LINE ID is already registered.' });
      throw e;
    }
  }
  res.status(500).json({ ok: false, error: 'Could not create a ticket. Please try again.' });
}));

// ---------------- admin ----------------
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many login attempts. Try again in 15 minutes.' } });

adminRouter.post('/login', loginLimit, (req, res) => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !JWT_SECRET) return res.status(500).json({ error: 'Admin login is not configured on the server (ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET).' });
  const { email = '', password = '' } = req.body || {};
  const ok = safeEqual(String(email).trim().toLowerCase(), ADMIN_EMAIL.trim().toLowerCase()) & safeEqual(password, ADMIN_PASSWORD);
  if (!ok) return res.status(401).json({ error: 'Wrong email or password.' });
  res.json({ token: jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' }) });
});

function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    if (!process.env.JWT_SECRET) throw new Error('no secret');
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Please log in again.' });
  }
}
adminRouter.use(requireAdmin);

adminRouter.get('/stats', wrap(async (_req, res) => {
  const [settings, total, confirmed, waitlist, checkedIn, recent] = await Promise.all([
    getSettings(), Registration.countDocuments(), Registration.countDocuments({ status: 'confirmed' }), Registration.countDocuments({ status: 'waitlist' }),
    Registration.countDocuments({ checkedIn: true }), Registration.find().sort({ createdAt: -1 }).limit(5).select('name email status createdAt').lean()
  ]);
  const since = new Date(Date.now() - 14 * 864e5);
  const daily = await Registration.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  res.json({ total, confirmed, waitlist, checkedIn, capacity: settings.event.capacity, recent, daily: daily.map(d => ({ date: d._id, count: d.n })) });
}));

adminRouter.get('/registrations', wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1), limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const q = {};
  if (['confirmed', 'waitlist'].includes(req.query.status)) q.status = req.query.status;
  const s = String(req.query.search || '').trim().slice(0, 60);
  if (s) { const re = new RegExp(escapeRe(s), 'i'); q.$or = [{ name: re }, { email: re }, { lineId: re }, { ticketCode: re }]; }
  const [items, total] = await Promise.all([Registration.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-lineIdKey -__v').lean(), Registration.countDocuments(q)]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

const csvCell = v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
adminRouter.get('/registrations.csv', wrap(async (_req, res) => {
  const rows = await Registration.find().sort({ createdAt: 1 }).lean();
  const head = ['Name', 'Email', 'LINE ID', 'Status', 'Checked in', 'Ticket code', 'Registered at'];
  const body = rows.map(r => [r.name, r.email, r.lineId, r.status, r.checkedIn ? 'yes' : 'no', r.ticketCode, new Date(r.createdAt).toISOString()].map(csvCell).join(','));
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="registrations.csv"' });
  res.send('﻿' + [head.map(csvCell).join(','), ...body].join('\r\n'));
}));

adminRouter.patch('/registrations/:id', wrap(async (req, res) => {
  const set = {};
  if (['confirmed', 'waitlist'].includes(req.body?.status)) set.status = req.body.status;
  if (typeof req.body?.checkedIn === 'boolean') { set.checkedIn = req.body.checkedIn; set.checkedInAt = req.body.checkedIn ? new Date() : null; }
  if (!Object.keys(set).length) return res.status(400).json({ error: 'Nothing to update.' });
  const doc = await Registration.findByIdAndUpdate(req.params.id, set, { new: true }).select('-lineIdKey -__v').lean();
  if (!doc) return res.status(404).json({ error: 'Not found.' });
  res.json(doc);
}));

adminRouter.delete('/registrations/:id', wrap(async (req, res) => {
  const doc = await Registration.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found.' });
  res.json({ ok: true });
}));

adminRouter.get('/settings', wrap(async (_req, res) => res.json(await getSettings())));
adminRouter.put('/settings', wrap(async (req, res) => res.json(await saveSettings(req.body))));

export { publicRouter, adminRouter };
