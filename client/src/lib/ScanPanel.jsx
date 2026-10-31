import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import '../styles/scan.css';

let ac;
function beep(ok) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = ok ? 880 : 200;
    g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + (ok ? 0.18 : 0.4));
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.45);
  } catch { /* sound is optional */ }
  try { navigator.vibrate?.(ok ? 60 : [120, 60, 120]); } catch { /* optional */ }
}

/** Camera QR scanner + manual code box. `submit(code)` must resolve to { ok, name, seat, message, reason }. */
export default function ScanPanel({ submit, title = 'Scan ticket' }) {
  const video = useRef(null), canvas = useRef(null), busy = useRef(false), lastCode = useRef({ code: '', at: 0 });
  const [camErr, setCamErr] = useState('');
  const [result, setResult] = useState(null);
  const [manual, setManual] = useState('');
  const [count, setCount] = useState(0);

  const handle = useCallback(async code => {
    if (busy.current) return; busy.current = true;
    try {
      const r = await submit(code);
      setResult(r); beep(!!r.ok); if (r.ok) setCount(c => c + 1);
    } catch (e) { setResult({ ok: false, message: e.message || 'Something went wrong.' }); beep(false); }
    setTimeout(() => { busy.current = false; }, 1800);
  }, [submit]);

  useEffect(() => {
    let stream, raf, stopped = false, last = 0;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
        const v = video.current; v.srcObject = stream; v.setAttribute('playsinline', 'true'); await v.play();
        const tick = now => {
          raf = requestAnimationFrame(tick);
          if (now - last < 120 || busy.current || v.readyState < 2) return; last = now;
          const w = 480, h = Math.round(w * v.videoHeight / v.videoWidth) || 360, c = canvas.current; c.width = w; c.height = h;
          const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(v, 0, 0, w, h);
          const q = jsQR(x.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
          if (q?.data && (q.data !== lastCode.current.code || now - lastCode.current.at > 4000)) { lastCode.current = { code: q.data, at: now }; handle(q.data); }
        };
        raf = requestAnimationFrame(tick);
      } catch (e) { setCamErr(e.name === 'NotAllowedError' ? 'Camera permission was denied. Allow the camera in your browser settings, or type the code below.' : 'No camera available here. Type the ticket code below.'); }
    })();
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()); };
  }, [handle]);

  return (
    <div className="scan">
      <h2>{title}</h2>
      <div className={`scan-view${result ? (result.ok ? ' ok' : ' bad') : ''}`}>
        <video ref={video} muted playsInline />
        <canvas ref={canvas} hidden />
        <i className="scan-frame" aria-hidden="true"><b /><b /><b /><b /></i>
        {camErr && <p className="scan-cam">{camErr}</p>}
      </div>
      <div className={`scan-result${result ? (result.ok ? ' ok' : ' bad') : ''}`} role="status" aria-live="polite">
        {!result && <span>Point the camera at the QR code on the ticket.</span>}
        {result?.ok && <><strong>{result.name}</strong><span>Checked in{result.seat ? ` · Seat ${result.seat}` : ''}</span></>}
        {result && !result.ok && <><strong>{result.name || 'Not accepted'}</strong><span>{result.message}{result.at ? ` (${new Date(result.at).toLocaleTimeString()})` : ''}</span></>}
      </div>
      <form className="scan-manual" onSubmit={e => { e.preventDefault(); if (manual.trim()) { handle(manual.trim()); setManual(''); } }}>
        <input value={manual} onChange={e => setManual(e.target.value.toUpperCase())} placeholder="GDC-XXXXXX" maxLength={12} aria-label="Ticket code" autoCapitalize="characters" spellCheck="false" />
        <button type="submit">Check in</button>
      </form>
      <p className="scan-count">Checked in on this device: <b>{count}</b></p>
    </div>
  );
}
