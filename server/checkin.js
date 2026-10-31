import { Registration } from './models.js';

/** Mark a ticket as checked in. Atomic, so two scanners cannot both succeed for the same ticket. */
export async function checkIn(codeRaw, by) {
  const code = String(codeRaw || '').trim().toUpperCase().slice(0, 20);
  if (!/^GDC-[A-Z0-9]{6}$/.test(code)) return { ok: false, reason: 'invalid', message: 'That is not a valid ticket code.' };
  const done = await Registration.findOneAndUpdate(
    { ticketCode: code, status: 'confirmed', checkedIn: { $ne: true } },
    { checkedIn: true, checkedInAt: new Date(), checkedInBy: String(by || '').slice(0, 80) }, { new: true }
  );
  if (done) return { ok: true, name: done.name, seat: done.seat || null, code };
  const r = await Registration.findOne({ ticketCode: code }).lean();
  if (!r) return { ok: false, reason: 'notfound', message: 'Ticket not found.' };
  if (r.status === 'waitlist') return { ok: false, reason: 'waitlist', message: 'This person is on the waitlist, not confirmed.', name: r.name };
  return { ok: false, reason: 'already', message: 'Already checked in.', name: r.name, seat: r.seat || null, at: r.checkedInAt };
}
