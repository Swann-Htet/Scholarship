import React, { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { prepareImage } from '../lib/image.js';

/** Pick, shrink and upload an image. value = uploaded image id. kind: "logo" (keeps transparency) or "photo" (square crop). */
export default function ImageUpload({ value, onChange, kind = 'logo', label = 'Upload image', flash, onAuthError, size = 72 }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = async e => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const img = await prepareImage(file, { kind });
      const { id } = await api.uploadAsset(img);
      onChange(id);
    } catch (err) { if (!onAuthError?.(err)) flash?.(err.message, true); }
    finally { setBusy(false); }
  };

  return (
    <div className={`img-up ${kind}`}>
      <div className="img-up-box" style={{ width: kind === 'logo' ? size * 2 : size, height: size }}>
        {value ? <img src={`/api/asset/${value}`} alt="" /> : <span>{kind === 'logo' ? 'No logo' : 'No photo'}</span>}
      </div>
      <div className="img-up-btns">
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} />
        <button type="button" className="a-btn" onClick={() => input.current.click()} disabled={busy}>{busy ? 'Uploading…' : value ? 'Replace' : label}</button>
        {value && <button type="button" className="a-btn danger" onClick={() => onChange('')} disabled={busy}>Remove</button>}
      </div>
    </div>
  );
}
