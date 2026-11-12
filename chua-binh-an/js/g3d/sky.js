/* =========================================================================
 *  BẦU TRỜI & NGÀY ĐÊM THEO GIỜ VIỆT NAM THẬT
 *  - Vòm trời chuyển màu: bình minh → trời xanh → hoàng hôn → đêm có sao
 *  - Mây trôi, mặt trời / mặt trăng
 *  - Ánh sáng chung tối dần; ban đêm đèn lồng tự sáng, đèn pha rọi chánh điện,
 *    đèn trên thuyền & cột đèn đá ở sân lát gạch. Ngoài khu có đèn thì tối.
 * ========================================================================= */
import { THREE, mat } from '../temple3d.js';

const C3 = (h) => new THREE.Color(h);
const mix = (a, b, k) => a.clone().lerp(b, Math.max(0, Math.min(1, k)));
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* độ cao mặt trời (độ) theo giờ VN, có tính độ dài ngày theo mùa (vĩ độ ~16°) */
export function sunAltitude(d) {
  const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  const dayLen = 12 + 1.15 * Math.sin(2 * Math.PI * (doy - 80) / 365);   // giờ
  const noon = 11.9, rise = noon - dayLen / 2, set = noon + dayLen / 2;
  const h = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  const maxAlt = 90 - Math.abs(16 - 23.44 * Math.sin(2 * Math.PI * (doy - 80) / 365));
  if (h >= rise && h <= set) return { alt: maxAlt * Math.sin(Math.PI * (h - rise) / (set - rise)), az: (h - noon) / (dayLen / 2), h };
  const nightLen = 24 - dayLen, k = ((h - set + 24) % 24) / nightLen;   // 0 lúc lặn → 1 lúc mọc
  return { alt: -40 * Math.sin(Math.PI * k), az: 0, h };
}

function cloudTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 26; i++) {
    const x = 40 + rnd() * 176, y = 50 + rnd() * 40 - Math.abs(x - 128) * 0.12, r = 18 + rnd() * 30;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,220,160,0.6)'); gr.addColorStop(1, 'rgba(255,180,100,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function initSky(scene, hemi, sun) {
  /* ---- vòm trời ---- */
  const U = { top: { value: C3(0x3d7fd9) }, hor: { value: C3(0xa9d1f2) }, low: { value: C3(0x6a7a6a) }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: C3(0xfff1c8) }, night: { value: 0 }, glow: { value: 0.6 } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(780, 40, 20), new THREE.ShaderMaterial({
    uniforms: U, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, hor, low, sunCol, sunDir; uniform float night, glow; varying vec3 vD;
      float h3(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      void main(){ float y = vD.y;
        vec3 c = y > 0.0 ? mix(hor, top, pow(clamp(y,0.0,1.0), 0.55)) : mix(hor, low, clamp(-y*4.0,0.0,1.0));
        float sd = max(dot(vD, normalize(sunDir)), 0.0);
        c += sunCol * (pow(sd, 6.0) * 0.35 * glow + pow(sd, 400.0) * 1.2);           // quầng & đĩa mặt trời
        if (night > 0.0 && y > 0.02) { vec3 q = floor(vD * 260.0); float s = h3(q); c += vec3(step(0.9965, s)) * night * (0.6 + 0.4*h3(q+3.1)); }   // sao
        gl_FragColor = vec4(c, 1.0); }`
  }));
  dome.renderOrder = -10; dome.frustumCulled = false; scene.add(dome);

  /* ---- mây ---- */
  const ct = cloudTex(), cloudsArr = [];
  for (let i = 0; i < 22; i++) {
    const m = new THREE.SpriteMaterial({ map: ct, transparent: true, depthWrite: false, fog: false, opacity: 0.85 });
    const sp = new THREE.Sprite(m), a = i / 22 * Math.PI * 2 + Math.random() * 0.2, r = 240 + Math.random() * 260, w = 110 + Math.random() * 110;
    sp.scale.set(w, w * 0.42, 1); sp.userData = { a, r, y: 110 + Math.random() * 120, sp: 0.004 + Math.random() * 0.004 }; sp.renderOrder = -9; scene.add(sp); cloudsArr.push(sp);
  }
  /* ---- mặt trời / mặt trăng ---- */
  const gt = glowTex();
  const sunSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: 0xfff1c0, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); sunSp.scale.set(120, 120, 1); sunSp.renderOrder = -9; scene.add(sunSp);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(13, 32), new THREE.MeshBasicMaterial({ color: 0xf4f1e2, fog: false, transparent: true }));
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: 0x9fb4ff, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0.6 })); moonGlow.scale.set(110, 110, 1);
  scene.add(moon, moonGlow); moon.renderOrder = moonGlow.renderOrder = -9;

  /* ---- đèn đêm: vài đèn điểm dùng chung (gán cho đèn lồng gần người chơi nhất) + 2 đèn pha rọi chánh điện ---- */
  const MOB = matchMedia('(pointer: coarse)').matches;   // điện thoại: ít đèn hơn (mỗi đèn làm mọi bề mặt phải tính thêm → GPU điện thoại nặng)
  const POOL = MOB ? 3 : 8, pool = [];
  for (let i = 0; i < POOL; i++) { const pl = new THREE.PointLight(0xffb060, 0, 12, 1.5); scene.add(pl); pool.push(pl); }
  const spots = (MOB ? [] : [0, 1]).map(() => { const s = new THREE.SpotLight(0xffd9a0, 0, 40, 0.5, 0.6, 1.2); scene.add(s); scene.add(s.target); return s; });
  // đèn chiếu sáng chung cả sân chùa ban đêm (mỗi sân 1–2 đèn lớn treo cao) + đèn trong chánh điện sáng mạnh hơn
  const yardLights = (MOB ? [0, 1] : [0, 1, 2, 3]).map(() => { const l = new THREE.PointLight(0xffdcae, 0, 40, 1); scene.add(l); return l; });
  let hallLights = [];
  let lamps = [], glows = [], world = null, nightK = 0, lastAssign = 0;

  function setWorld(W) {
    world = W; glows.forEach(g => g.parent && g.parent.remove(g)); glows = []; lamps = [];
    yardLights.forEach(l => { l.userData.on = false; }); hallLights = [];
    if (!W) return;
    W.root.updateMatrixWorld(true);
    { const spots = []; (W.layout.yard || []).forEach(Y => { const [x0, z0, x1, z1] = Y.r, w = x1 - x0, d = z1 - z0, y = (Y.y || 0) + 7.5, n = Math.max(w, d) > 34 ? 2 : 1;
        for (let i = 0; i < n; i++) { const k = (i + 0.5) / n; spots.push({ x: w > d ? x0 + w * k : (x0 + x1) / 2, z: w > d ? (z0 + z1) / 2 : z0 + d * k, y, r: Math.hypot(w / n, d) * 0.75 + 6 }); } });
      spots.slice(0, yardLights.length).forEach((p, i) => { const l = yardLights[i]; l.position.set(p.x, p.y, p.z); l.distance = p.r; l.userData.on = true; }); }
    W.halls.forEach(h => h.group && h.group.traverse(o => { if (o.isPointLight) hallLights.push({ l: o, base: o.intensity }); }));
    const v = new THREE.Vector3();
    W.root.traverse(o => {
      if (!o.isMesh) return;
      const isLamp = o.userData.nightLamp || (o.material && o.material === mat('lantern', 0xd9332a));
      if (!isLamp) return;
      o.getWorldPosition(v); lamps.push({ p: v.clone(), boost: o.userData.nightLamp ? 1.2 : 1 });
      const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: 0xffb060, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      g.scale.set(2.2, 2.2, 1); g.position.copy(v); g.userData.tmp = true; scene.add(g); glows.push(g);
    });
    // đèn pha: từ sân trước rọi vào mặt tiền chánh điện chính
    const h = W.halls[0];
    if (h && h.group && h.d) {
      [-1, 1].forEach((sx, i) => { const s = spots[i]; if (!s) return;
        s.position.copy(h.group.localToWorld(new THREE.Vector3(sx * h.w * 0.45, 0.4, h.d / 2 + 9)));
        s.target.position.copy(h.group.localToWorld(new THREE.Vector3(sx * h.w * 0.15, (h.ceilY - h.group.getWorldPosition(v).y) * 0.6, h.d / 2 - 0.5))); s.target.updateMatrixWorld(); });
    }
  }

  function update(dt, camera, me, t) {
    const now = window.__skyHour != null ? (() => { const d = new Date(); d.setHours(Math.floor(window.__skyHour), Math.round((window.__skyHour % 1) * 60), 0, 0); return d; })()
      : new Date(Date.now() + (new Date().getTimezoneOffset() + 420) * 60000);
    const S = sunAltitude(now), alt = S.alt;
    const day = smooth(-4, 10, alt), dusk = smooth(-8, 2, alt) * (1 - smooth(4, 18, alt));   // 1 lúc chạng vạng / bình minh
    nightK = 1 - smooth(-9, 1, alt);
    // màu trời
    const topDay = C3(0x3f82dc), horDay = C3(0xb3d8f4), topDusk = C3(0x3b4d8c), horDusk = C3(0xf3a25c), topNight = C3(0x040915), horNight = C3(0x111a33);
    const top = mix(mix(topNight, topDusk, smooth(-10, 0, alt)), topDay, day), hor = mix(mix(horNight, horDusk, smooth(-10, 0, alt)), horDay, day);
    U.top.value.copy(top); U.hor.value.copy(mix(hor, C3(0xf0905a), dusk * 0.6)); U.low.value.copy(mix(C3(0x0a0d12), C3(0x6f8070), day)); U.night.value = smooth(0.55, 1, nightK);   // sao chỉ hiện khi trời đã tối hẳn
    // hướng mặt trời: mọc đông (+x), lặn tây (−x), nghiêng nam
    const el = THREE.MathUtils.degToRad(alt), azr = S.az * Math.PI / 2;
    const sd = new THREE.Vector3(-Math.sin(azr) * Math.cos(el), Math.sin(el), -0.35 * Math.cos(el)).normalize();
    U.sunDir.value.copy(sd); U.sunCol.value.copy(mix(C3(0xff8a3a), C3(0xfff1c8), smooth(0, 25, alt))); U.glow.value = 0.4 + dusk;
    const cp = camera.position;
    dome.position.copy(cp);
    sunSp.position.copy(cp).addScaledVector(sd, 700); sunSp.visible = alt > -3; sunSp.material.color.copy(U.sunCol.value);
    const md = new THREE.Vector3(0.35, Math.max(0.25, Math.sin(Math.PI * nightK * 0.9)), -0.6).normalize();
    moon.position.copy(cp).addScaledVector(md, 690); moon.lookAt(cp); moonGlow.position.copy(moon.position);
    moon.material.opacity = moonGlow.material.opacity = smooth(0.2, 0.7, nightK); moon.visible = moonGlow.visible = nightK > 0.15;
    // mây: trắng ban ngày, ửng hồng chạng vạng, xám mờ ban đêm
    const cc = mix(mix(C3(0x3a4152), C3(0xffb38a), smooth(-10, 0, alt)), C3(0xffffff), day);
    cloudsArr.forEach(c => { const u = c.userData; u.a += u.sp * dt * 0.1; c.position.set(cp.x + Math.cos(u.a) * u.r, u.y, cp.z + Math.sin(u.a) * u.r); c.material.color.copy(cc); c.material.opacity = 0.35 + 0.5 * (1 - nightK * 0.6); });
    // ánh sáng chung
    hemi.intensity = 0.22 + 0.76 * day; hemi.color.copy(mix(C3(0x5a6a9a), C3(0xfff4dd), day)); hemi.groundColor.copy(mix(C3(0x14121a), C3(0x5a4a3a), day));
    sun.intensity = 1.55 * day + 0.22 * nightK; sun.color.copy(nightK > 0.5 ? C3(0x8fa6d8) : mix(C3(0xff9a50), C3(0xffe2b0), smooth(0, 20, alt)));
    if (scene.fog) { scene.fog.color.copy(U.hor.value); scene.fog.near = 140 - 110 * nightK; scene.fog.far = 640 - 380 * nightK; }   // ngày: núi xa mờ sương; đêm: tối nhanh
    scene.background = null;
    // đèn lồng & đèn pha ban đêm
    const lit = smooth(0.25, 0.75, nightK);
    const lm = mat('lantern', 0xd9332a), pm = mat('paperLamp', 0xffd9a0), sm = mat('stoneLamp', 0xffd28a);
    lm.emissiveIntensity = 0.6 + 2.2 * lit; pm.emissiveIntensity = 1.1 + 1.4 * lit; if (sm.emissive) sm.emissiveIntensity = 0.15 + 2.4 * lit;
    glows.forEach((g, i) => { g.material.opacity = 0.85 * lit * (0.9 + 0.1 * Math.sin(t * 3 + i)); g.visible = lit > 0.02; });
    spots.forEach(s => { s.intensity = 260 * lit; });
    yardLights.forEach(l => { l.intensity = l.userData.on ? 22 * lit : 0; });
    hallLights.forEach(h => { h.l.intensity = h.base * (1 + 2.6 * lit); });
    if (t - lastAssign > 0.8 && me && me.av) {   // gán đèn điểm cho các đèn lồng gần nhất
      lastAssign = t; const p = me.av.root.position;
      const near = lamps.slice().sort((a, b) => a.p.distanceToSquared(p) - b.p.distanceToSquared(p)).slice(0, POOL);
      pool.forEach((pl, i) => { const L = near[i]; if (L) { pl.position.copy(L.p); pl.userData.boost = L.boost; } else pl.userData.boost = 0; });
    }
    pool.forEach(pl => { pl.intensity = 14 * lit * (pl.userData.boost || 0); });
    return { nightK, alt };
  }
  return { update, setWorld, get night() { return nightK; } };
}
