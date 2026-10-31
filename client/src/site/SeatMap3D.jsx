import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { seatLabels, rowLetter } from '../../../shared/seats.js';

/**
 * Animated cinema-style 3D seating plan.
 *  - Seats rise in row by row, people pop in/out as seats fill or change.
 *  - `mine`: the visitor's own seat gets a glowing beam, a bobbing marker, and the camera flies to it.
 *  - `admin`: seats are clickable (onSelect) and hovering shows who sits there (`occupants`: label -> name).
 * props: capacity, cols, taken (labels), occupants ({label: name}), selected (label), mine (label), admin, onSelect(label)
 */
const PEOPLE = ['#FFB020', '#2DD4BF', '#8B7CFF', '#FF6B9A', '#5EA8FF', '#7BD88F', '#FF8A5C', '#C58AFF'];
const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const easeOutBack = k => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
const easeInOut = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export default function SeatMap3D({ capacity, cols, taken = [], occupants = {}, selected = '', mine = '', admin = false, onSelect }) {
  const mount = useRef(null);
  const api = useRef({});
  const [tip, setTip] = useState(null);
  const [webgl, setWebgl] = useState(true);
  const props = useRef({});
  props.current = { taken: new Set(taken), occupants, selected, mine, admin, onSelect };

  useEffect(() => {
    const el = mount.current;
    const cs = getComputedStyle(document.documentElement);
    const c1 = cs.getPropertyValue('--amber').trim() || '#FFB020', c2 = cs.getPropertyValue('--teal').trim() || '#2DD4BF';
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch { setWebgl(false); return undefined; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'pan-y';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const labels = seatLabels(capacity, cols), rows = Math.ceil(capacity / cols), step = 0.64, R0 = 3.6, dR = 1.25, Rmax = R0 + (rows - 1) * dR;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(3, 9, 8); scene.add(sun);
    const glow = new THREE.PointLight(new THREE.Color(c2), 60, 22, 1.6); glow.position.set(0, 2.4, 0.5); scene.add(glow);
    const glow2 = new THREE.PointLight(new THREE.Color(c1), 30, 22, 1.6); glow2.position.set(-3, 2, 2); scene.add(glow2);

    // stage
    const stageW = Math.max(5, cols * 0.5);
    const stage = new THREE.Mesh(new RoundedBoxGeometry(stageW, 0.3, 2.2, 3, 0.1), new THREE.MeshStandardMaterial({ color: 0x2a2535, roughness: 0.5, metalness: 0.2 }));
    stage.position.set(0, 0, -0.4); scene.add(stage);
    const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 256;
    const g = sc.getContext('2d'), grad = g.createLinearGradient(0, 0, 1024, 0); grad.addColorStop(0, c1); grad.addColorStop(1, c2);
    g.fillStyle = grad; g.fillRect(0, 0, 1024, 256); g.fillStyle = 'rgba(255,255,255,.92)'; g.font = '700 110px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STAGE', 512, 134);
    const stex = new THREE.CanvasTexture(sc); stex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(stageW, stageW / 4), new THREE.MeshBasicMaterial({ map: stex }));
    screen.position.set(0, 0.3 + stageW / 8, -1.3); scene.add(screen);
    const floorGlow = new THREE.Mesh(new THREE.CircleGeometry(Rmax + 2.5, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(c2), transparent: true, opacity: 0.06 }));
    floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.y = -0.2; scene.add(floorGlow);

    // seats (+ a person on each, shown only while the seat is taken)
    const seatGeo = new RoundedBoxGeometry(0.5, 0.18, 0.5, 3, 0.07), backGeo = new RoundedBoxGeometry(0.5, 0.5, 0.12, 3, 0.06), armGeo = new RoundedBoxGeometry(0.07, 0.22, 0.46, 2, 0.03);
    const torsoGeo = new RoundedBoxGeometry(0.3, 0.34, 0.2, 3, 0.09), headGeo = new THREE.SphereGeometry(0.115, 20, 16);
    const seats = [], byLabel = {};
    labels.forEach((label, i) => {
      const r = Math.floor(i / cols), c = i % cols, R = R0 + r * dR, th = (c - (cols - 1) / 2) * (step / R);
      const grp = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.05, emissive: 0x000000 });
      const cushion = new THREE.Mesh(seatGeo, mat); cushion.position.y = 0.28;
      const back = new THREE.Mesh(backGeo, mat); back.position.set(0, 0.56, -0.24); back.rotation.x = -0.12;
      const a1 = new THREE.Mesh(armGeo, mat), a2 = new THREE.Mesh(armGeo, mat); a1.position.set(-0.28, 0.4, 0); a2.position.set(0.28, 0.4, 0);
      const pMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, emissive: 0x000000 }), skin = new THREE.MeshStandardMaterial({ color: 0xf1c9a5, roughness: 0.6 });
      const person = new THREE.Group(), torso = new THREE.Mesh(torsoGeo, pMat), head = new THREE.Mesh(headGeo, skin);
      torso.position.set(0, 0.62, -0.08); head.position.set(0, 0.94, -0.07); person.add(torso, head); person.scale.setScalar(0.0001); person.visible = false;
      grp.add(cushion, back, a1, a2, person);
      grp.position.set(Math.sin(th) * R, r * 0.3, Math.cos(th) * R); grp.rotation.y = th + Math.PI;
      grp.userData = { label, mat, pMat, person, cur: 0, base: 1, baseY: r * 0.3, delay: r * 0.09 + Math.abs(c - (cols - 1) / 2) * 0.012, ph: Math.random() * 6 };
      [cushion, back, a1, a2, torso, head].forEach(m => { m.userData.seat = grp; });
      scene.add(grp); seats.push(grp); byLabel[label] = grp;
    });

    // row letters
    const labelTex = txt => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '700 84px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 64, 68); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
    for (let r = 0; r < rows; r++) {
      const R = R0 + r * dR, th = ((cols - 1) / 2 + 1.1) * (step / R);
      [-th, th].forEach(a => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(rowLetter(r)), transparent: true })); sp.scale.set(0.42, 0.42, 1); sp.position.set(Math.sin(a) * R, r * 0.3 + 0.35, Math.cos(a) * R); scene.add(sp); });
    }

    // "your seat" marker: glowing beam, floor ring and a bobbing arrow
    const marker = new THREE.Group(); marker.visible = false; scene.add(marker);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 6, 28, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(c1), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 3.2; marker.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(c1), transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; marker.add(ring);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 20), new THREE.MeshStandardMaterial({ color: new THREE.Color(c1), emissive: new THREE.Color(c1), emissiveIntensity: 0.8 }));
    arrow.rotation.x = Math.PI; marker.add(arrow);

    // camera
    const home = { pos: new THREE.Vector3(0, 4.4 + rows * 0.55, Rmax + 5.2), target: new THREE.Vector3(0, 0.6 + rows * 0.12, (R0 + Rmax) / 2 - 0.8) };
    camera.position.copy(home.pos); camera.lookAt(home.target);
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    let controls = null;
    if (fine) {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(home.target); controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.minPolarAngle = 0.55; controls.maxPolarAngle = 1.3; controls.minAzimuthAngle = -0.95; controls.maxAzimuthAngle = 0.95; controls.update();
    }

    const ray = new THREE.Raycaster(), pt = new THREE.Vector2();
    let hover = null, down = null, visible = true, raf = 0, lastMine = '', fly = null;
    const t0 = performance.now();
    const pick = e => {
      const r = renderer.domElement.getBoundingClientRect();
      pt.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(pt, camera);
      const h = ray.intersectObjects(seats, true)[0];
      return h ? h.object.userData.seat : null;
    };
    const tipFor = (s, e) => {
      const l = s.userData.label, P = props.current, who = P.occupants[l], taken = P.taken.has(l), r = el.getBoundingClientRect();
      const text = P.admin ? (who ? `${l} · ${who}` : `${l} · free`) : `Seat ${l}${P.mine === l ? ' (yours)' : taken ? ' · taken' : ' · free'}`;
      setTip({ x: e.clientX - r.left, y: e.clientY - r.top, text, taken });
    };
    const onMove = e => { const s = pick(e), was = hover; hover = s; renderer.domElement.style.cursor = s && props.current.admin ? 'pointer' : 'grab'; if (s) tipFor(s, e); else if (was) setTip(null); };
    const onDown = e => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = e => { if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; } down = null; const s = pick(e); if (s && props.current.admin) props.current.onSelect?.(s.userData.label); };
    const cv = renderer.domElement;
    cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointerleave', () => { hover = null; setTip(null); });

    const col = new THREE.Color(), tmp = new THREE.Vector3();
    const startFly = seat => {
      if (calm) return;
      const wp = new THREE.Vector3(); seat.getWorldPosition(wp);
      const dir = wp.clone().setY(0).normalize();
      const toPos = wp.clone().add(dir.multiplyScalar(3.4)).add(new THREE.Vector3(0, 2.2, 0));
      fly = { t: performance.now(), from: { pos: camera.position.clone(), target: (controls ? controls.target : home.target).clone() }, to: { pos: toPos, target: wp.clone().add(new THREE.Vector3(0, 0.5, 0)) } };
      if (controls) controls.enabled = false;
    };
    const frame = now => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const t = (now - t0) / 1000, P = props.current;

      // camera fly-to-my-seat, hold, then glide back
      if (fly) {
        const e = (now - fly.t) / 1000, GO = 1.5, HOLD = 1.1, BACK = 1.5;
        let k, a, b, ta, tb;
        if (e < GO) { k = easeInOut(e / GO); a = fly.from.pos; b = fly.to.pos; ta = fly.from.target; tb = fly.to.target; }
        else if (e < GO + HOLD) { k = 1; a = fly.from.pos; b = fly.to.pos; ta = fly.from.target; tb = fly.to.target; }
        else if (e < GO + HOLD + BACK) { k = 1 - easeInOut((e - GO - HOLD) / BACK); a = home.pos; b = fly.to.pos; ta = home.target; tb = fly.to.target; }
        else { fly = null; if (controls) { controls.enabled = true; camera.position.copy(home.pos); controls.target.copy(home.target); controls.update(); } }
        if (fly) { camera.position.lerpVectors(a, b, k); tmp.lerpVectors(ta, tb, k); camera.lookAt(tmp); if (controls) controls.target.copy(tmp); }
      } else if (controls) controls.update();
      else if (!calm) { camera.position.x = Math.sin(t / 3500) * 1.6; camera.lookAt(home.target); }

      // my seat marker
      if (P.mine !== lastMine) { lastMine = P.mine; const s = byLabel[P.mine]; marker.visible = !!s; if (s) { marker.position.copy(s.position); marker.rotation.copy(s.rotation); if (t > 1.5) startFly(s); } }
      if (marker.visible) { arrow.position.y = 1.55 + Math.sin(t * 3) * 0.12; ring.scale.setScalar(1 + ((t * 0.8) % 1) * 0.9); ring.material.opacity = 0.9 * (1 - ((t * 0.8) % 1)); beam.material.opacity = 0.22 + 0.1 * Math.sin(t * 2.4); }

      glow.intensity = 55 + 8 * Math.sin(t * 1.1);
      seats.forEach(s => {
        const u = s.userData, l = u.label, taken = P.taken.has(l), isSel = l === P.selected, isMine = l === P.mine;
        // entrance: rise and pop in, row by row
        const k = Math.min(1, Math.max(0, (t - u.delay) / 0.75)), grow = calm ? 1 : easeOutBack(k);
        // colours
        col.set(isMine ? c1 : isSel ? '#6ea8ff' : taken ? '#8d889a' : c2); u.mat.color.lerp(col, 0.2);
        const pulse = isSel || isMine ? 0.35 + 0.25 * Math.sin(t * 4) : s === hover ? 0.25 : 0;
        u.mat.emissive.set(isSel ? '#6ea8ff' : isMine ? c1 : c2).multiplyScalar(pulse);
        const target = (isSel || isMine ? 1.18 : s === hover ? 1.1 : 1);
        u.base += (target - u.base) * 0.2;
        s.scale.setScalar(Math.max(0.0001, grow * u.base)); s.position.y = u.baseY - (1 - k) * (calm ? 0 : 0.9);
        // person sitting here: pops in and out, breathes gently
        const want = taken ? 1 : 0; u.cur += (want - u.cur) * 0.14;
        u.person.visible = u.cur > 0.02; if (u.person.visible) {
          const who = P.occupants[l] || l; u.pMat.color.set(PEOPLE[hash(who) % PEOPLE.length]);
          u.person.scale.setScalar(Math.max(0.0001, u.cur * (1 + 0.025 * Math.sin(t * 2 + u.ph)))); u.person.position.y = 0.02 * Math.sin(t * 2 + u.ph);
        }
      });
      renderer.render(scene, camera);
    };
    const resize = () => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 500 ? 52 : 38; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.05 }); io.observe(el);
    raf = requestAnimationFrame(frame);

    api.current = { dispose: () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); controls?.dispose();
      cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointerup', onUp);
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.map?.dispose(); m.dispose(); }); });
      renderer.dispose(); renderer.forceContextLoss?.(); el.removeChild(cv);
    } };
    return () => api.current.dispose?.();
  }, [capacity, cols]);

  if (!webgl) return <p className="seat-fallback">Your browser cannot show the 3D seating plan.</p>;
  return (
    <div className={`seatmap${admin ? ' admin' : ''}`} ref={mount} role="img" aria-label={`Seating plan with ${capacity} seats. ${taken.length} are taken.${mine ? ' Your seat is ' + mine + '.' : ''}`}>
      {tip && <div className={`seat-tip${tip.taken ? ' taken' : ''}`} style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}
    </div>
  );
}
