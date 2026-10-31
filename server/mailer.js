import nodemailer from 'nodemailer';

let transport;
export const mailConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
export const devOtp = () => process.env.NODE_ENV !== 'production' && process.env.DEV_SHOW_OTP === '1';

function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, connectionTimeout: 10000, socketTimeout: 15000 });
  }
  return transport;
}

const from = () => process.env.MAIL_FROM || `Global Dialogues <${process.env.SMTP_USER}>`;
const wrapHtml = body => `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1D1B26">${body}<p style="color:#8a8692;font-size:12px;margin-top:28px">If you did not request this, you can ignore this email.</p></div>`;

export async function sendOtp(to, name, code, minutes, eventTitle) {
  if (!mailConfigured()) {
    if (devOtp()) { console.log(`[DEV] OTP for ${to}: ${code}`); return; }
    const e = new Error('Email is not configured on the server (SMTP_HOST, SMTP_USER, SMTP_PASS).'); e.code = 'NO_MAIL'; throw e;
  }
  await getTransport().sendMail({
    from: from(), to, subject: `${code} is your ${eventTitle} verification code`,
    text: `Hi ${name},\n\nYour verification code is ${code}. It expires in ${minutes} minutes.\n`,
    html: wrapHtml(`<h2 style="margin:0 0 8px">Verify your email</h2><p>Hi ${esc(name)}, enter this code on the registration page:</p><p style="font-size:34px;letter-spacing:8px;font-weight:700;margin:18px 0">${code}</p><p>It expires in ${minutes} minutes.</p>`)
  });
}

export async function sendTicket(to, name, ticket, event) {
  if (!mailConfigured()) return;
  const wait = ticket.status === 'waitlist';
  await getTransport().sendMail({
    from: from(), to, subject: `${wait ? 'Waitlist' : 'Your ticket'}: ${event.title}`,
    text: `Hi ${name},\n\n${wait ? 'You are on the waitlist.' : 'You are registered.'}\nTicket code: ${ticket.ticketCode}\n${ticket.seat ? 'Seat: ' + ticket.seat + '\n' : ''}${event.dateLabel}, ${event.startTime} to ${event.endTime}\n${event.venue}\n`,
    html: wrapHtml(`<h2 style="margin:0 0 8px">${wait ? 'You are on the waitlist' : 'You are registered'}</h2><p>Hi ${esc(name)},</p><p><b>${esc(event.title)}</b><br>${esc(event.dateLabel)}, ${esc(event.startTime)} to ${esc(event.endTime)}<br>${esc(event.venue)}</p><p style="font-size:22px;letter-spacing:3px;font-weight:700">${ticket.ticketCode}</p>${ticket.seat ? `<p>Seat <b>${esc(ticket.seat)}</b></p>` : ''}<p>Show your ticket QR code at registration. Dress code: black and white, with jeans.</p>`)
  });
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
