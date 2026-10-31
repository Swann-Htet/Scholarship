import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { seatLabels, rowLetter } from '../../../shared/seats.js';

// A cinema-style 3D seat map. Seats sit on curved, rising rows facing the stage.
// props: capacity, cols, taken (array of labels), selected (label | ''), onSelect(label), interactive, mine (label of the visitor's own ticket)
export default function SeatMap3D({ capacity, cols, taken, selected, onSelect, interactive = true, mine = '' }) {
  const mount = useRef(null);
  const api = useRef({});
  const [tip, setTip] = useState(null);
  const [webgl, setWebgl] = useState(true);
  const props = useRef({});
  props.current = { taken: new Set(taken), selected, onSelect, interactive, mine };

  // ---- build the scene once per layout ----
  useEffect(() => {
    const el = mount.current;
    const cs = getComputedStyle(document.documentElement);
    const c1 = cs.getPropertyValue('--amber').trim() || '#FFB020', c2 = cs.getPropertyValue('--teal').trim() || '#2DD4BF';
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch { setWebgl(false); return undefined; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'pan-y'; // the page can still scroll when a finger starts on the map

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const labels = seatLabels(capacity, cols), rows = Math.ceil(capacity / cols), step = 0.64;
    const R0 = 3.6, dR = 1.25;
    const Rmax = R0 + (rows - 1) * dR;

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(3, 9, 8); scene.add(sun);
    const glow = new THREE.PointLight(new THREE.Color(c2), 60, 22, 1.6); glow.position.set(0, 2.4, 0.5); scene.add(glow);
    const glow2 = new THREE.PointLight(new THREE.Color(c1), 30, 22, 1.6); glow2.position.set(-3, 2, 2); scene.add(glow2);

    // stage: a lit platform and a glowing screen
    const stageW = Math.max(5, cols * 0.5);
    const stage = new THREE.Mesh(new RoundedBoxGeometry(stageW, 0.3, 2.2, 3, 0.1), new THREE.MeshStandardMaterial({ color: 0x2a2535, roughness: 0.5, metalness: 0.2 }));
    stage.position.set(0, 0.0, -0.4); scene.add(stage);
    const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 256;
    const g = sc.getContext('2d'), grad = g.createLinearGradient(0, 0, 1024, 0); grad.addColorStop(0, c1); grad.addColorStop(1, c2);
    g.fillStyle = grad; g.fillRect(0, 0, 1024, 256); g.fillStyle = 'rgba(255,255,255,.92)'; g.font = '700 110px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STAGE', 512, 134);
    const stex = new THREE.CanvasTexture(sc); stex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(stageW, stageW / 4), new THREE.MeshBasicMaterial({ map: stex }));
    screen.position.set(0, 0.3 + stageW / 8, -1.3); scene.add(screen);
    const floorGlow = new THREE.Mesh(new THREE.CircleGeometry(Rmax + 2.5, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(c2), transparent: true, opacity: 0.06 }));
    floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.y = -0.2; scene.add(floorGlow);

    // seats
    const seatGeo = new RoundedBoxGeometry(0.5, 0.18, 0.5, 3, 0.07), backGeo = new RoundedBoxGeometry(0.5, 0.5, 0.12, 3, 0.06), armGeo = new RoundedBoxGeometry(0.07, 0.22, 0.46, 2, 0.03);
    const seats = [];
    labels.forEach((label, i) => {
      const r = Math.floor(i / cols), c = i % cols, R = R0 + r * dR, th = (c - (cols - 1) / 2) * (step / R);
      const grp = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.05, emissive: 0x000000 });
      const cushion = new THREE.Mesh(seatGeo, mat); cushion.position.y = 0.28;
      const back = new THREE.Mesh(backGeo, mat); back.position.set(0, 0.56, -0.24); back.rotation.x = -0.12;
      const a1 = new THREE.Mesh(armGeo, mat), a2 = new THREE.Mesh(armGeo, mat); a1.position.set(-0.28, 0.4, 0); a2.position.set(0.28, 0.4, 0);
      grp.add(cushion, back, a1, a2);
      grp.position.set(Math.sin(th) * R, r * 0.3, Math.cos(th) * R);
      grp.rotation.y = th + Math.PI;
      grp.userData = { label, mat, base: 1 };
      cushion.userData.seat = back.userData.seat = a1.userData.seat = a2.userData.seat = grp;
      scene.add(grp); seats.push(grp);
    });

    // row letters at both ends of each row
    const labelTex = txt => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '700 84px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 64, 68); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
    for (let r = 0; r < rows; r++) {
      const R = R0 + r * dR, th = ((cols - 1) / 2 + 1.1) * (step / R);
      [-th, th].forEach(a => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(rowLetter(r)), transparent: true })); sp.scale.set(0.42, 0.42, 1); sp.position.set(Math.sin(a) * R, r * 0.3 + 0.35, Math.cos(a) * R); scene.add(sp); });
    }

    camera.position.set(0, 4.4 + rows * 0.55, Rmax + 5.2);
    const target = new THREE.Vector3(0, 0.6 + rows * 0.12, (R0 + Rmax) / 2 - 0.8);
    camera.lookAt(target);

    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches, calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let controls = null;
    if (fine) {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(target); controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.minPolarAngle = 0.55; controls.maxPolarAngle = 1.3; controls.minAzimuthAngle = -0.95; controls.maxAzimuthAngle = 0.95; controls.update();
    }

    const ray = new THREE.Raycaster(), pt = new THREE.Vector2();
    let hover = null, down = null, running = false, visible = true, raf = 0, t0 = performance.now();
    const pick = e => {
      const r = renderer.domElement.getBoundingClientRect();
      pt.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(pt, camera);
      const hit = ray.intersectObjects(seats, true)[0];
      return hit ? hit.object.userData.seat : null;
    };
    const onMove = e => {
      const s = pick(e); const was = hover; hover = s;
      renderer.domElement.style.cursor = s && props.current.interactive && !props.current.taken.has(s.userData.label) ? 'pointer' : s ? 'not-allowed' : 'grab';
      if (s) { const r = el.getBoundingClientRect(); setTip({ x: e.clientX - r.left, y: e.clientY - r.top, label: s.userData.label, taken: props.current.taken.has(s.userData.label), mine: props.current.mine === s.userData.label }); } else if (was) setTip(null);
    };
    const onDown = e => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = e => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
      down = null; const s = pick(e);
      if (s && props.current.interactive && !props.current.taken.has(s.userData.label)) props.current.onSelect?.(s.userData.label === props.current.selected ? '' : s.userData.label);
    };
    const cv = renderer.domElement;
    cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointerleave', () => { hover = null; setTip(null); });

    const colour = new THREE.Color();
    const paint = (time) => {
      const { taken: tk, selected: sel, mine: mn } = props.current;
      seats.forEach(s => {
        const l = s.userData.label, m = s.userData.mat, isTaken = tk.has(l), isSel = l === sel, isMine = l === mn;
        colour.set(isMine ? c1 : isSel ? c1 : isTaken ? '#8d889a' : c2);
        m.color.lerp(colour, 0.25);
        const pulse = isSel || isMine ? 0.35 + 0.25 * Math.sin(time / 260) : s === hover && !isTaken ? 0.25 : 0;
        m.emissive.set(isSel || isMine ? c1 : c2).multiplyScalar(pulse);
        const target = isSel || isMine ? 1.18 : s === hover && !isTaken ? 1.1 : 1;
        s.userData.base += (target - s.userData.base) * 0.2; s.scale.setScalar(s.userData.base);
      });
    };
    const frame = now => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const t = now - t0;
      if (controls) controls.update(); else if (!calm) { camera.position.x = Math.sin(t / 3500) * 1.6; camera.lookAt(target); }
      glow.intensity = 55 + 8 * Math.sin(t / 900);
      paint(now); renderer.render(scene, camera);
    };
    const resize = () => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 500 ? 52 : 38; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.05 }); io.observe(el);
    raf = requestAnimationFrame(frame); running = true;

    api.current = { dispose: () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); controls?.dispose();
      cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointerup', onUp);
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.map?.dispose(); m.dispose(); }); } });
      renderer.dispose(); renderer.forceContextLoss?.(); el.removeChild(cv);
    } };
    return () => { api.current.dispose?.(); };
  }, [capacity, cols]);

  if (!webgl) return <p className="seat-fallback">Your browser cannot show the 3D seat map. A seat will be assigned automatically.</p>;
  return (
    <div className="seatmap" ref={mount} role="img" aria-label={`Seat map with ${capacity} seats. ${taken.length} are taken.`}>
      {tip && <div className={`seat-tip${tip.taken ? ' taken' : ''}`} style={{ left: tip.x, top: tip.y }}>Seat {tip.label}{tip.mine ? ' (yours)' : tip.taken ? ' · taken' : ' · free'}</div>}
    </div>
  );
}
