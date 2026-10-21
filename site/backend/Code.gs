/**
 * Google Apps Script backend for the registration form.
 * Setup: create a Google Sheet, Extensions > Apps Script, paste this file,
 * then Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
 * Put the web app URL in event.config.js as `endpoint`.
 */
const SHEET = 'Registrations';
const CAPACITY = 80;           // keep in sync with event.config.js
const EVENT_NAME = 'Global Dialogues: Co-existing';
const EVENT_INFO = '15 November 2026, 08:30 to 16:00, M4U Networking Space, Mae Fah Luang University';
const HEADERS = ['timestamp', 'full_name', 'student_id', 'email', 'phone_or_line', 'nationality', 'faculty', 'year', 'student_type',
  'languages_spoken', 'languages_can_teach', 'dietary', 'accessibility', 'interests', 'mfu333_interest', 'consent_data', 'consent_contact',
  'status', 'checked_in', 'ticket_code'];

function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.appendRow(HEADERS); sh.setFrozenRows(1); }
  return sh;
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet(e) {
  const rows = sheet_().getDataRange().getValues().slice(1);
  const confirmed = rows.filter(r => r[17] === 'confirmed').length;
  return json_({ confirmed: confirmed, capacity: CAPACITY });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    // server-side validation (mirror of the client rules)
    if (d.website) return json_({ ok: false, error: 'rejected' });
    if (!d.full_name || d.full_name.trim().length < 2) return json_({ ok: false, error: 'Invalid name.' });
    if (!/^\d{7,12}$/.test(String(d.student_id).trim())) return json_({ ok: false, error: 'Invalid student ID.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(d.email).trim())) return json_({ ok: false, error: 'Invalid email.' });
    if (!d.consent_data || !d.consent_contact) return json_({ ok: false, error: 'Consent is required.' });

    const sh = sheet_();
    const rows = sh.getDataRange().getValues().slice(1);
    const sid = String(d.student_id).trim(), mail = String(d.email).trim().toLowerCase();
    if (rows.some(r => String(r[2]) === sid || String(r[3]).toLowerCase() === mail)) return json_({ ok: false, error: 'duplicate' });

    const status = rows.filter(r => r[17] === 'confirmed').length >= CAPACITY ? 'waitlist' : 'confirmed';
    const code = 'GDC-' + Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
    sh.appendRow([new Date(), d.full_name, sid, mail, d.phone || '', d.nationality, d.faculty, d.year, d.student_type,
      d.languages_spoken, d.languages_can_teach, d.diet + (d.diet_other ? ': ' + d.diet_other : ''), d.access || '', d.interest || '',
      d.mfu333 ? 'yes' : 'no', true, true, status, false, code]);

    try { mail_(d, status, code); } catch (err) { /* ticket is still valid if email fails */ }
    return json_({ ok: true, status: status, ticketCode: code });
  } catch (err) {
    return json_({ ok: false, error: 'Server error.' });
  } finally {
    lock.releaseLock();
  }
}

function mail_(d, status, code) {
  const wait = status === 'waitlist';
  const qr = UrlFetchApp.fetch('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(code)).getBlob().setName('qr.png');
  const html = '<div style="font-family:Arial,sans-serif;max-width:480px">' +
    '<h2>' + (wait ? 'You are on the waitlist' : 'You are registered') + '</h2>' +
    '<p>Hi ' + d.full_name + ',</p>' +
    '<p>' + (wait ? 'The event is full for now. We will email you if a place opens.' : 'Show this QR code at registration from 08:30.') + '</p>' +
    '<p><b>' + EVENT_NAME + '</b><br>' + EVENT_INFO + '<br>Dress code: black and white, with jeans.</p>' +
    '<img src="cid:qr" width="180" height="180" alt="Ticket QR"><p style="letter-spacing:3px"><b>' + code + '</b></p></div>';
  MailApp.sendEmail({ to: d.email, subject: EVENT_NAME + ': ' + (wait ? 'waitlist' : 'your ticket'), htmlBody: html, inlineImages: { qr: qr } });
}

/** Optional check-in helper: call from a small admin page with ?action=checkin&code=GDC-XXXXXX&key=SECRET */
