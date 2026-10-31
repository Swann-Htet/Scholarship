import { Router } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Registration, Pending, Block, Admin, CheckinLink, Asset } from '../models.js';
import { sendTest } from '../mailer.js';
import { stripUnsafe } from '../../shared/emailTemplate.js';
import { getSettings, saveSettings } from '../settings.js';
import { hashPassword, verifyPassword } from '../password.js';
import { hit, blockIp, blockBody, rejectBlocked, sha256, clientIp, wrap } from '../security.js';
import { checkIn } from '../checkin.js';
import { layoutLabels, seatOrder } from '../../shared/layout.js';

const router = Router();
const MIN = 60 * 1000;
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const same = (a, b) => crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(), crypto.createHash('sha256').update(String(b)).digest());
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------------- login: the owner (from .env) or any admin added in the panel ----------------
router.post('/login', rejectBlocked, wrap(async (req, res) => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !JWT_SECRET) return res.status(500).json({ error: 'Admin login is not configured on the server (ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET).' });
  const email = String(req.body?.email || '').trim().toLowerCase(), password = String(req.body?.password || '');
  if (await hit('login:' + clientIp(req), 15 * MIN) > 10) { const k = await blockIp(req, 'too many admin login attempts'); return res.status(429).json(blockBody(k)); }

  let who = null;
  const isOwnerEmail = same(email, ADMIN_EMAIL.trim().toLowerCase());
  if (isOwnerEmail && same(password, ADMIN_PASSWORD)) who = { email: ADMIN_EMAIL.trim().toLowerCase(), owner: true };
  else if (!isOwnerEmail) {
    const a = await Admin.findOne({ email });
    if (a && verifyPassword(password, a.passwordHash)) who = { email: a.email, owner: false };
    else verifyPassword(password, 'aa:bb'); // keep timing similar when the account does not exist
  }
  if (!who) return res.status(401).json({ error: 'Wrong email or password.' });
  res.json({ token: jwt.sign({ role: 'admin', email: who.email, owner: who.owner }, JWT_SECRET, { expiresIn: '12h' }), email: who.email, owner: who.owner });
}));

function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    if (!process.env.JWT_SECRET) throw new Error('no secret');
    const p = jwt.verify(token, process.env.JWT_SECRET);
    if (p.role !== 'admin') throw new Error('role');
    req.admin = p; next();
  } catch { res.status(401).json({ error: 'Please log in again.' }); }
}
router.use(requireAdmin);

// ---------------- dashboard ----------------
router.get('/stats', wrap(async (_req, res) => {
  const [settings, total, confirmed, waitlist, checkedIn, recent, blocked, pending] = await Promise.all([
    getSettings(), Registration.countDocuments(), Registration.countDocuments({ status: 'confirmed' }), Registration.countDocuments({ status: 'waitlist' }),
    Registration.countDocuments({ checkedIn: true }), Registration.find().sort({ createdAt: -1 }).limit(5).select('name email status seat createdAt').lean(),
    Block.countDocuments({ until: { $gt: new Date() } }), Pending.countDocuments()
  ]);
  const since = new Date(Date.now() - 14 * 864e5);
  const daily = await Registration.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  res.json({ total, confirmed, waitlist, checkedIn, blocked, pending, capacity: settings.event.capacity, recent, daily: daily.map(d => ({ date: d._id, count: d.n })) });
}));

// ---------------- registrations ----------------
router.get('/registrations', wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1), limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const q = {};
  if (['confirmed', 'waitlist'].includes(req.query.status)) q.status = req.query.status;
  const s = String(req.query.search || '').trim().slice(0, 60);
  if (s) { const re = new RegExp(escapeRe(s), 'i'); q.$or = [{ name: re }, { email: re }, { lineId: re }, { ticketCode: re }, { seat: re }]; }
  const [items, total] = await Promise.all([Registration.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-lineIdKey -emailKey -__v').lean(), Registration.countDocuments(q)]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

const csvCell = v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
router.get('/registrations.csv', wrap(async (_req, res) => {
  const rows = await Registration.find().sort({ createdAt: 1 }).lean();
  const head = ['Name', 'Email', 'LINE ID', 'Seat', 'Status', 'Checked in', 'Ticket code', 'Registered at'];
  const body = rows.map(r => [r.name, r.email, r.lineId, r.seat || '', r.status, r.checkedIn ? 'yes' : 'no', r.ticketCode, new Date(r.createdAt).toISOString()].map(csvCell).join(','));
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="registrations.csv"' });
  res.send('﻿' + [head.map(csvCell).join(','), ...body].join('\r\n'));
}));

// give a person a seat, move them, or swap with whoever sits there (admin seat editor)
async function setSeat(reg, targetRaw) {
  const settings = await getSettings(), labels = layoutLabels(settings.seating.layout), target = String(targetRaw || '').toUpperCase().trim();
  if (reg.status !== 'confirmed') return { error: 'Only confirmed registrations have seats.' };
  if (!target) { await Registration.updateOne({ _id: reg._id }, { $unset: { seat: 1 } }); return { ok: true }; }
  if (!labels.includes(target)) return { error: 'That seat does not exist.' };
  if (reg.seat === target) return { ok: true };
  const other = await Registration.findOne({ seat: target, _id: { $ne: reg._id } });
  if (!other) { await Registration.updateOne({ _id: reg._id }, { seat: target }); return { ok: true }; }
  const old = reg.seat; // swap: free the unique seat names first so neither update collides
  await Registration.updateOne({ _id: reg._id }, { $unset: { seat: 1 } });
  try {
    await Registration.updateOne({ _id: other._id }, old ? { seat: old } : { $unset: { seat: 1 } });
    await Registration.updateOne({ _id: reg._id }, { seat: target });
  } catch (e) { if (old) await Registration.updateOne({ _id: reg._id }, { seat: old }).catch(() => {}); throw e; }
  return { ok: true, swappedWith: other.name };
}

router.get('/seatmap', wrap(async (_req, res) => {
  const s = await getSettings();
  const confirmed = await Registration.find({ status: 'confirmed' }).sort({ createdAt: 1 }).select('name email seat checkedIn ticketCode').lean();
  const waitlist = await Registration.countDocuments({ status: 'waitlist' });
  res.json({ capacity: s.event.capacity, layout: s.seating.layout, seated: confirmed.filter(r => r.seat), unseated: confirmed.filter(r => !r.seat), waitlist });
}));

router.post('/seatmap/auto-assign', wrap(async (_req, res) => {
  const s = await getSettings(), order = seatOrder(s.seating.layout);
  const taken = new Set(await Registration.distinct('seat', { seat: { $exists: true, $ne: null } }));
  const people = await Registration.find({ status: 'confirmed', seat: { $exists: false } }).sort({ createdAt: 1 }).select('_id');
  let n = 0;
  for (const p of people) { const seat = order.find(l => !taken.has(l)); if (!seat) break; taken.add(seat); await Registration.updateOne({ _id: p._id }, { seat }); n++; }
  res.json({ ok: true, assigned: n, left: people.length - n });
}));

router.patch('/registrations/:id', wrap(async (req, res) => {
  if (typeof req.body?.seat === 'string') {
    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ error: 'Not found.' });
    const r = await setSeat(reg, req.body.seat);
    if (r.error) return res.status(400).json({ error: r.error });
    return res.json({ ...(await Registration.findById(reg._id).select('-lineIdKey -emailKey -__v').lean()), swappedWith: r.swappedWith });
  }
  const set = {}, unset = {};
  if (['confirmed', 'waitlist'].includes(req.body?.status)) { set.status = req.body.status; if (req.body.status === 'waitlist') unset.seat = 1; }
  if (typeof req.body?.checkedIn === 'boolean') { set.checkedIn = req.body.checkedIn; set.checkedInAt = req.body.checkedIn ? new Date() : null; set.checkedInBy = req.admin.email; }
  if (!Object.keys(set).length) return res.status(400).json({ error: 'Nothing to update.' });
  const upd = Object.keys(unset).length ? { $set: set, $unset: unset } : set;
  const doc = await Registration.findByIdAndUpdate(req.params.id, upd, { new: true }).select('-lineIdKey -emailKey -__v').lean();
  if (!doc) return res.status(404).json({ error: 'Not found.' });
  res.json(doc);
}));

router.delete('/registrations/:id', wrap(async (req, res) => {
  const doc = await Registration.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found.' });
  res.json({ ok: true });
}));

// ---------------- settings ----------------
router.get('/settings', wrap(async (_req, res) => res.json(await getSettings())));
router.put('/settings', wrap(async (req, res) => { const { data, unseated } = await saveSettings(req.body); res.json({ ...data, _unseated: unseated }); }));

// ---------------- uploaded images (logo, people photos) ----------------
const MAGIC = { 'image/png': b => b.length > 8 && b.readUInt32BE(0) === 0x89504e47, 'image/jpeg': b => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, 'image/webp': b => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' };
router.post('/assets', wrap(async (req, res) => {
  const mime = String(req.body?.mime || ''), b64 = String(req.body?.data || '').replace(/^data:[^,]+,/, '');
  if (!MAGIC[mime]) return res.status(400).json({ error: 'Only PNG, JPEG or WebP images are allowed.' });
  const buf = Buffer.from(b64, 'base64');
  if (!buf.length || buf.length > 700 * 1024) return res.status(400).json({ error: 'Image is too large (max 700 KB). Use a smaller image.' });
  if (!MAGIC[mime](buf)) return res.status(400).json({ error: 'That file is not a real image of that type.' });
  if (await hit('upload:' + req.admin.email, 10 * MIN) > 40) return res.status(429).json({ error: 'Too many uploads. Wait a few minutes.' });
  const a = await Asset.create({ mime, name: String(req.body?.name || 'image').slice(0, 80), size: buf.length, data: buf, createdBy: req.admin.email });
  res.status(201).json({ id: a.id });
}));

// ---------------- email templates ----------------
router.post('/email/test', wrap(async (req, res) => {
  const to = String(req.body?.to || '').trim().toLowerCase(), which = req.body?.which === 'ticket' ? 'ticket' : 'otp';
  if (!EMAIL.test(to)) return res.status(400).json({ error: 'Enter a valid email address to send the test to.' });
  if (await hit('mailtest:' + req.admin.email, 60 * MIN) > 15) return res.status(429).json({ error: 'Too many test emails. Try again later.' });
  const settings = await getSettings();
  const subject = String(req.body?.subject || settings.email[which].subject).slice(0, 200), html = stripUnsafe(String(req.body?.html || settings.email[which].html).slice(0, 30000));
  try { const sent = await sendTest({ to, which, subject, html, settings, siteUrl: process.env.SITE_URL || `${req.protocol}://${req.get('host')}` }); res.json({ ok: true, subject: sent }); }
  catch (e) { res.status(e.code === 'NO_MAIL' ? 503 : 502).json({ error: e.code === 'NO_MAIL' ? 'Email is not set up on the server yet (SMTP settings).' : `The email service refused it: ${e.message}` }); }
}));

// ---------------- admins ----------------
router.get('/admins', wrap(async (req, res) => {
  const list = await Admin.find().sort({ createdAt: 1 }).select('email createdBy createdAt').lean();
  res.json({ me: req.admin.email, owner: { email: String(process.env.ADMIN_EMAIL || '').toLowerCase() }, admins: list });
}));

router.post('/admins', wrap(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase(), password = String(req.body?.password || '');
  if (!EMAIL.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 10) return res.status(400).json({ error: 'Password must be at least 10 characters.' });
  if (email === String(process.env.ADMIN_EMAIL || '').trim().toLowerCase() || await Admin.exists({ email })) return res.status(409).json({ error: 'That email is already an admin.' });
  const a = await Admin.create({ email, passwordHash: hashPassword(password), createdBy: req.admin.email });
  res.status(201).json({ _id: a._id, email: a.email, createdBy: a.createdBy, createdAt: a.createdAt });
}));

router.patch('/admins/:id', wrap(async (req, res) => {
  const password = String(req.body?.password || '');
  if (password.length < 10) return res.status(400).json({ error: 'Password must be at least 10 characters.' });
  const a = await Admin.findByIdAndUpdate(req.params.id, { passwordHash: hashPassword(password) });
  if (!a) return res.status(404).json({ error: 'Not found.' });
  res.json({ ok: true });
}));

router.delete('/admins/:id', wrap(async (req, res) => {
  const a = await Admin.findById(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found.' });
  if (a.email === req.admin.email) return res.status(400).json({ error: 'You cannot remove your own account.' });
  await a.deleteOne();
  res.json({ ok: true });
}));

// ---------------- frozen visitors ----------------
router.get('/blocks', wrap(async (_req, res) => {
  const items = await Block.find({ until: { $gt: new Date() } }).sort({ until: -1 }).limit(100).select('ip userAgent reason until strikes createdAt').lean();
  res.json({ items });
}));
router.delete('/blocks/:id', wrap(async (req, res) => { await Block.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

// ---------------- check-in ----------------
router.get('/checkin-links', wrap(async (_req, res) => {
  const items = await CheckinLink.find().sort({ createdAt: -1 }).limit(50).select('label expiresAt revoked uses lastUsedAt createdBy createdAt').lean();
  res.json({ items });
}));

router.post('/checkin-links', wrap(async (req, res) => {
  const label = String(req.body?.label || '').trim().slice(0, 60) || 'Check-in desk';
  const hours = Math.min(24 * 30, Math.max(1, Number(req.body?.hours) || 12));
  const token = crypto.randomBytes(24).toString('base64url'); // shown once: only its hash is stored
  const l = await CheckinLink.create({ tokenHash: sha256(token), label, expiresAt: new Date(Date.now() + hours * 36e5), createdBy: req.admin.email });
  res.status(201).json({ _id: l._id, token, label, expiresAt: l.expiresAt });
}));

router.delete('/checkin-links/:id', wrap(async (req, res) => { await CheckinLink.findByIdAndUpdate(req.params.id, { revoked: true }); res.json({ ok: true }); }));

router.post('/checkin', wrap(async (req, res) => res.json(await checkIn(req.body?.code, req.admin.email))));

export default router;
