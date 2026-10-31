import crypto from 'node:crypto';
import { Block, Hit } from './models.js';

export const LOCK_MINUTES = 15;
const LOCK_MS = LOCK_MINUTES * 60 * 1000;

export const clientIp = req => String(req.ip || req.socket?.remoteAddress || 'unknown').replace(/^::ffff:/, '');
export const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');
export const secret = () => process.env.JWT_SECRET || '';

/** Increment a rolling counter and return the new count. Works across serverless instances. */
export async function hit(key, windowMs, inc = 1) {
  const now = Date.now();
  for (let i = 0; i < 3; i++) {
    let d = await Hit.findOneAndUpdate({ key, expireAt: { $gt: new Date(now) } }, { $inc: { count: inc } }, { new: true });
    if (d) return d.count;
    try {
      d = await Hit.findOneAndUpdate({ key }, { count: inc, expireAt: new Date(now + windowMs) }, { upsert: true, new: true });
      return d.count;
    } catch (e) { if (e.code !== 11000) throw e; }
  }
  return 1;
}

/** Freeze this visitor (IP address) for 15 minutes. Returns the block record. */
export async function blockIp(req, reason) {
  const ip = clientIp(req), until = new Date(Date.now() + LOCK_MS);
  return Block.findOneAndUpdate({ key: 'ip:' + ip }, { $set: { ip, userAgent: String(req.headers['user-agent'] || '').slice(0, 200), reason, until, purgeAt: new Date(until.getTime() + 864e5) }, $inc: { strikes: 1 } }, { upsert: true, new: true });
}

/** Add suspicion points. Reaching `limit` points within 15 minutes freezes the visitor. Mild mistakes (e.g. a wrong email domain) use a high limit because many students share one campus Wi-Fi address. */
export async function strike(req, reason, points = 1, limit = 3, bucket = 'bot') {
  const total = await hit(`strike:${bucket}:${clientIp(req)}`, LOCK_MS, points);
  return total >= limit ? blockIp(req, reason) : null;
}

export async function activeBlock(req) {
  const b = await Block.findOne({ key: 'ip:' + clientIp(req), until: { $gt: new Date() } }).lean();
  return b || null;
}

export const blockBody = b => ({
  ok: false, blocked: true, until: b.until,
  retryAfter: Math.max(1, Math.ceil((new Date(b.until).getTime() - Date.now()) / 1000)),
  error: `Suspicious activity detected. Your IP address, browser details and this attempt have been logged, and access is frozen for ${LOCK_MINUTES} minutes. Repeated attempts will be reported to the organisers.`
});

/** Express middleware: stop frozen visitors before they reach a route. */
export const rejectBlocked = async (req, res, next) => {
  try { const b = await activeBlock(req); if (b) return res.status(429).json(blockBody(b)); next(); } catch (e) { next(e); }
};

export const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
