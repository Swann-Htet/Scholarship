import crypto from 'node:crypto';

// Passwords are stored as salted scrypt hashes, never as text.
export const hashPassword = pw => {
  const salt = crypto.randomBytes(16);
  return salt.toString('hex') + ':' + crypto.scryptSync(String(pw), salt, 64).toString('hex');
};

export const verifyPassword = (pw, stored) => {
  try {
    const [s, h] = String(stored).split(':');
    const a = crypto.scryptSync(String(pw), Buffer.from(s, 'hex'), 64), b = Buffer.from(h, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch { return false; }
};
