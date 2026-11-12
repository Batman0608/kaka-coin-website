/* =========================================================================
 *  PHƯỢNG HOÀNG GIÁNG LÂM — chim phượng lần lượt ghé từng chùa, quay vòng mãi
 *  Mô hình: “phoenix bird” — NORBERTO-3D (Sketchfab, CC BY 4.0), có sẵn động tác vỗ cánh.
 *  · Lịch chung theo giờ thật (mọi người chơi thấy cùng một chỗ): mỗi chùa SLOT giây.
 *  · Mỗi lượt: hiện ra trong chánh điện (cột sáng, vòng hào quang, bụi vàng, chuông) →
 *    lượn quanh bàn thờ → bay ra cửa → lượn trên sân & quanh chùa → bay vút lên trời, tan
 *    thành ánh sáng → sang chùa kế tiếp.
 *  · Người chơi đứng gần bấm “Chiêm bái phượng hoàng” nhận hạt (mỗi lượt một lần).
 * ========================================================================= */
import { GLTFLoader } from '../../vendor/three/addons/GLTFLoader.js';

const SLOT = 8 * 60;                                     // mỗi chùa 8 phút
const T_IN = 6, T_HALL = 75, T_OUT = 92, T_UP = 440, T_GONE = 470;   // các mốc trong một lượt (giây)
const REWARD = 12;

export function initPhuongHoang({ THREE, scene, getW, getTemple, TEMPLES, me, toast, banner, ticker, A, addBeads, P, save, label, placeLabel, chatBubble }) {
  const now = () => Date.now() / 1000 + (globalThis.__phShift || 0);   // __phShift: chỉ dùng khi kiểm thử
  const slotOf = (t) => Math.floor(t / SLOT), templeOf = (s) => TEMPLES[((s % TEMPLES.length) + TEMPLES.length) % TEMPLES.length];
  let gl = null, loading = null, bird = null, mixer = null, here = false, curSlot = -1, fx = [], trail = null, glow = null, lbl = null, appeared = -1, left = -1, lastAnn = -1;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ---------- tải mô hình (chỉ khi phượng đang ở chùa mình) ---------- */
  function load() {
    if (gl) return Promise.resolve(gl); if (loading) return loading;
    return (loading = new GLTFLoader().loadAsync('assets/phuonghoang.glb').then(g => {
      g.scene.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; if (o.material) { o.material.emissiveIntensity = 1.4; } } });
      const inner = new THREE.Group(); inner.rotation.y = -Math.PI / 2; inner.add(g.scene);   // mô hình gốc bay theo trục +x → xoay về +z
      const box = new THREE.Box3().setFromObject(inner, true), c = box.getCenter(V()); g.scene.position.sub(c);
      const holder = new THREE.Group(); holder.add(inner); holder.userData.len = box.getSize(V()).length();
      gl = { g, holder }; return gl;
    }).catch(e => { console.warn('[Phượng hoàng]', e); loading = null; return null; }));
  }

  /* ---------- hiệu ứng ---------- */
  let _spark = null;
  function sparkTex() { if (_spark) return _spark; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.25, 'rgba(255,215,120,.9)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    _spark = new THREE.CanvasTexture(c); return _spark; }
  const addMat = (color, op = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  function burst(p, big = 1) {   // cột sáng + vòng hào quang lan rộng + bụi vàng bắn tung + chớp sáng
    const g = new THREE.Group(); g.position.copy(p); scene.add(g);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.9 * big, 1.4 * big, 14, 24, 1, true), addMat(0xffd27a, 0.7)); pillar.position.y = 5; g.add(pillar);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.9, 48), addMat(0xffe08a, 0.9)); ring.rotation.x = -Math.PI / 2; ring.position.y = -p.y + (getW() ? (getW().col.heightAt(p.x, p.z, p.y) ?? 0) : 0) + 0.06; g.add(ring);
    const N = 140, pos = new Float32Array(N * 3), vel = []; for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2 - 0.2, s = 2 + Math.random() * 4 * big; vel.push(V(Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + 1.5, Math.sin(a) * Math.cos(e) * s)); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: sparkTex(), size: 0.35 * big, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe2a0 })); g.add(pts);
    const light = new THREE.PointLight(0xffc870, 8 * big, 22, 1.6); light.position.y = 1.5; g.add(light);
    fx.push({ g, t: 0, life: 3.2, pillar, ring, pts, vel, light });
  }
  function fxStep(dt) {
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; const k = f.t / f.life;
      if (k >= 1) { scene.remove(f.g); f.g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); }); fx.splice(i, 1); continue; }
      f.pillar.material.opacity = 0.7 * (1 - k) * Math.min(1, f.t * 4); f.pillar.scale.set(1 + k * 0.6, 1, 1 + k * 0.6); f.pillar.rotation.y += dt;
      f.ring.scale.setScalar(1 + k * 9); f.ring.material.opacity = 0.9 * (1 - k);
      const a = f.pts.geometry.attributes.position; for (let j = 0; j < f.vel.length; j++) { const v = f.vel[j]; v.y -= dt * 1.2; a.setXYZ(j, a.getX(j) + v.x * dt, a.getY(j) + v.y * dt, a.getZ(j) + v.z * dt); v.multiplyScalar(1 - dt * 0.8); }
      a.needsUpdate = true; f.pts.material.opacity = 1 - k; f.light.intensity = f.light.intensity * (1 - dt * 2.2);
    }
  }
  function makeTrail() {   // vệt bụi vàng kéo theo đuôi
    const N = 160, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3).fill(-999), col = new Float32Array(N * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: sparkTex(), size: 0.28, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false; scene.add(pts); return { pts, age: new Float32Array(N).fill(9), vel: new Float32Array(N * 3), i: 0, acc: 0 };
  }
  const C1 = new THREE.Color(0xffe6a0), C2 = new THREE.Color(0xff6a20), tc = new THREE.Color();
  function trailStep(dt, from, on) {
    const T = trail; if (!T) return; const p = T.pts.geometry.attributes.position, c = T.pts.geometry.attributes.color;
    T.acc += dt * (on ? 90 : 0);
    while (T.acc >= 1) { T.acc -= 1; const j = T.i; T.i = (T.i + 1) % T.age.length; T.age[j] = 0;
      p.setXYZ(j, from.x + (Math.random() - 0.5) * 0.5, from.y + (Math.random() - 0.5) * 0.4, from.z + (Math.random() - 0.5) * 0.5);
      T.vel[j * 3] = (Math.random() - 0.5) * 0.4; T.vel[j * 3 + 1] = -0.3 - Math.random() * 0.5; T.vel[j * 3 + 2] = (Math.random() - 0.5) * 0.4; }
    for (let j = 0; j < T.age.length; j++) { if (T.age[j] > 1.6) { p.setY(j, -999); continue; } T.age[j] += dt; const k = Math.min(1, T.age[j] / 1.6);
      p.setXYZ(j, p.getX(j) + T.vel[j * 3] * dt, p.getY(j) + T.vel[j * 3 + 1] * dt, p.getZ(j) + T.vel[j * 3 + 2] * dt);
      tc.copy(C1).lerp(C2, k).multiplyScalar(1 - k); c.setXYZ(j, tc.r, tc.g, tc.b); }
    p.needsUpdate = true; c.needsUpdate = true;
  }

  /* ---------- đường bay trong một lượt (theo khung chánh điện của chùa) ---------- */
  function pathAt(t, W) {
    const H = W.halls && W.halls[0]; if (!H) return null;
    const G = H.group, m = G.userData.mainHall, base = m.base, d = m.d, w = m.w;
    const ceil = Math.max(base + 2.4, H.ceilY - G.position.y - 1.1);   // độ cao lượn trong điện (dưới xà)
    const L = (x, y, z) => G.localToWorld(V(x, y, z));
    const inHall = (tt) => { const a = tt * 0.45; return L(Math.sin(a) * w * 0.22, Math.min(ceil, base + 2.3) + Math.sin(tt * 1.3) * 0.25, -d / 2 + 4.6 + Math.sin(a * 2) * 1.2); };
    const front = G.localToWorld(V(0, base, d / 2 + 13)), R = 13;
    const circle = (tt) => { const a = (tt - T_OUT) * 0.16; return V(front.x + Math.sin(a) * R, front.y + 7.5 + Math.sin(tt * 0.5) * 1.5, front.z + Math.cos(a) * R); };
    const ease = (k) => k * k * (3 - 2 * k), lerp3 = (a, b, k) => a.clone().lerp(b, ease(Math.max(0, Math.min(1, k))));
    if (t < T_HALL) return { p: inHall(t), inside: true };
    if (t < T_OUT) { const k = (t - T_HALL) / (T_OUT - T_HALL), door = L(0, base + 2.2, d / 2 + 1.5);
      return k < 0.5 ? { p: lerp3(inHall(T_HALL), door, k * 2), inside: true } : { p: lerp3(door, circle(T_OUT + 0.01), (k - 0.5) * 2), inside: false }; }
    if (t < T_UP) return { p: circle(t), inside: false };
    if (t < T_GONE) { const k = (t - T_UP) / (T_GONE - T_UP), c = circle(T_UP); return { p: c.clone().add(V(0, ease(k) * 45, 0)), inside: false, rise: k }; }
    return null;
  }

  /* ---------- vòng đời ---------- */
  function onTemple() { dispose(); here = false; curSlot = -1; }
  function dispose() {
    if (gl && gl.holder.parent) scene.remove(gl.holder);
    if (trail) { scene.remove(trail.pts); trail.pts.geometry.dispose(); trail = null; }
    if (glow) { scene.remove(glow); glow = null; } if (lbl) { lbl.remove(); lbl = null; }
    fx.forEach(f => scene.remove(f.g)); fx = []; bird = null; mixer = null; appeared = left = -1;
  }
  const _a = V(), _b = V();
  function step(dt) {
    fxStep(dt);
    const t0 = now(), s = slotOf(t0), at = templeOf(s), t = t0 - s * SLOT, W = getW(), tp = getTemple();
    if (s !== lastAnn && t < T_GONE && ticker) { lastAnn = s; if (t < 60) ticker(`🐦 Phượng hoàng vừa giáng lâm ${at.name} — mau đến chiêm bái!`); }
    const mine = !!(tp && W && at.id === tp.id && t < T_GONE);
    if (!mine) { if (bird) { const p = bird.position.clone(); if (here) burst(p, 1.2); dispose(); } here = false; return; }
    if (curSlot !== s) { curSlot = s; appeared = left = -1; }
    if (!bird) { if (!gl) { load(); return; }
      bird = gl.holder; scene.add(bird); mixer = new THREE.AnimationMixer(gl.g.scene); mixer.clipAction(gl.g.animations[0]).play();
      trail = makeTrail(); glow = new THREE.PointLight(0xffa860, 1.6, 9, 1.6); scene.add(glow); lbl = label('🐦 Phượng hoàng', 'abbot'); here = true; }
    const P0 = pathAt(t, W), P1 = pathAt(t + 0.25, W); if (!P0) { burst(bird.position.clone(), 1.2); dispose(); return; }
    // xuất hiện: chỉ bùng hiệu ứng khi người chơi đang ở chùa lúc phượng tới (vào giữa chừng thì phượng đã có sẵn)
    if (appeared !== s) { appeared = s; if (t < T_IN + 2) { burst(P0.p, 1); if (A && A.bigBell) A.bigBell(); banner && banner('🐦 Phượng hoàng giáng lâm', at.name, 'Điềm lành đến chùa · lại gần để chiêm bái'); } }
    if (P0.rise > 0.85 && left !== s) { left = s; burst(bird.position.clone(), 1.4); A && A.khanh && A.khanh(); }
    const len = gl.holder.userData.len || 1, size = (P0.inside ? 2.6 : 3.8) * (1 - Math.max(0, (P0.rise || 0) - 0.6) * 1.8), k = Math.max(0.01, size / len);
    const appear = Math.min(1, t / T_IN); bird.scale.setScalar(k * (0.2 + 0.8 * appear));
    bird.position.copy(P0.p);
    if (P1) { _a.copy(P1.p).sub(P0.p); if (_a.lengthSq() > 1e-6) { const yaw = Math.atan2(_a.x, _a.z), pitch = -Math.atan2(_a.y, Math.hypot(_a.x, _a.z));
      bird.rotation.set(pitch * 0.6, yaw, 0, 'YXZ'); } }
    mixer.update(dt * (P0.rise ? 1.6 : 1));
    _b.set(0, 0, -0.45 * size).applyEuler(bird.rotation).add(bird.position);   // đuôi
    trailStep(dt, _b, true);
    glow.position.copy(bird.position); glow.intensity = 1.6 + Math.sin(t0 * 3) * 0.4;
    placeLabel(lbl, bird.position, size * 0.45);
  }
  function context() {
    if (!bird || !here) return null; const s = curSlot;
    if (Math.hypot(me.pos.x - bird.position.x, me.pos.z - bird.position.z) > 9) return null;
    if (P.phSeen === s) return null;
    return { label: '🙏 Chiêm bái phượng hoàng', fn: () => { P.phSeen = s; save(); addBeads && addBeads(REWARD); me.av && me.av.bow && me.av.bow(); burst(bird.position.clone(), 0.6);
      toast(`🐦 Phượng hoàng ban điềm lành · +${REWARD} hạt`); } };
  }
  /* cho biết phượng đang ở đâu & bao lâu nữa sang chùa khác (Cài đặt / bản đồ có thể dùng) */
  function where() { const t0 = now(), s = slotOf(t0), t = t0 - s * SLOT; return { temple: templeOf(s), next: templeOf(s + 1), left: Math.max(0, SLOT - t), gone: t >= T_GONE }; }
  setTimeout(load, 12000);   // tải sẵn mô hình (≈1 MB) sau khi game đã chạy ổn, để lúc phượng tới là hiện ngay
  return { onTemple, dispose, step, context, where };
}
