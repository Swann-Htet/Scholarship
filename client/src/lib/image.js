// Shrinks a picked image in the browser before upload, so uploads stay small and fast.
// Logos stay PNG (keeps transparency). Photos are cropped square and saved as JPEG.
export async function prepareImage(file, { kind = 'logo' } = {}) {
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) throw new Error('Please choose a PNG, JPG or WebP image.');
  const bmp = await createImageBitmap(file);
  const photo = kind === 'photo';
  const max = photo ? 400 : 480;
  let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height, w, h;
  if (photo) { const s = Math.min(bmp.width, bmp.height); sx = (bmp.width - s) / 2; sy = (bmp.height - s) / 2; sw = sh = s; w = h = Math.min(max, s); }
  else { const k = Math.min(1, max / Math.max(bmp.width, bmp.height)); w = Math.round(bmp.width * k); h = Math.round(bmp.height * k); }
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  if (photo) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
  const mime = photo ? 'image/jpeg' : 'image/png';
  const blob = await new Promise(res => cv.toBlob(res, mime, 0.86));
  if (!blob) throw new Error('Could not read that image.');
  const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
  return { name: file.name, mime, data };
}
