/* Arena mascots — original low-poly cartoon characters drawn with Three.js.
 * One "street brawler" mascot wearing the current lane's colour, upgraded by Trophy Road skins.
 * Loaded on demand by app.js, only when the Arena theme and 3D are switched on.
 */
import * as THREE from "./vendor/three.module.min.js";

const LANE = {
  ai: "#3b82f6", cs: "#22c55e", project: "#f97316", dsa: "#8b5cf6", research: "#ec4899",
  kaggle: "#14b8a6", sd: "#6366f1", ielts: "#eab308", routine: "#94a3b8"
};
const SKIN_TONE = "#f7c59a";
const INK = "#141a33";
const GOLD = "#ffc933";

// ---------- materials

function toonRamp() {
  const data = new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

class Kit {
  constructor() {
    this.ramp = toonRamp();
    this.outline = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
    this.owned = []; // geometries/materials to dispose with the character
  }
  mat(color, emissive) {
    const m = new THREE.MeshToonMaterial({ color, gradientMap: this.ramp });
    if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = 0.9; }
    this.owned.push(m);
    return m;
  }
  glow(color) {
    const m = new THREE.MeshBasicMaterial({ color });
    this.owned.push(m);
    return m;
  }
  // Mesh with a thick cartoon outline (inverted hull).
  mesh(geo, material, outline = 1.08) {
    this.owned.push(geo);
    const m = new THREE.Mesh(geo, material);
    if (outline) {
      const o = new THREE.Mesh(geo, this.outline);
      o.scale.setScalar(outline);
      m.add(o);
    }
    return m;
  }
  dispose() {
    this.owned.forEach((x) => x.dispose());
    this.owned = [];
  }
}

const lighten = (hex, t) => "#" + new THREE.Color(hex).lerp(new THREE.Color("#ffffff"), t).getHexString();
const darken = (hex, t) => "#" + new THREE.Color(hex).lerp(new THREE.Color("#000000"), t).getHexString();

function starShape(outer, inner) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i) s.lineTo(x, y); else s.moveTo(x, y);
  }
  return s;
}

// ---------- character: "Street brawler" — cap, tank top, suspenders, rolled shorts, high-tops, fists on hips.
// Original design; the lane colour shows on the cap, wristbands and sneaker stripes.

function buildCharacter(kit, lane, skin, mood) {
  const color = LANE[lane] || LANE.routine;
  const sleeping = mood === "sleep";
  const root = new THREE.Group();   // drag rotation
  const body = new THREE.Group();   // bob / jump
  root.add(body);
  const parts = { root, body };
  const put = (obj, x, y, z, parent) => { obj.position.set(x, y, z); parent.add(obj); return obj; };

  const skinMat = kit.mat(SKIN_TONE);
  const shorts = kit.mat("#7d8a4e");          // olive cargo shorts
  const cuff = kit.mat("#687440");
  const tank = kit.mat("#f5f5f2");
  const strap = kit.mat(skin.gold ? GOLD : "#22284a");
  const laneMat = kit.mat(color);
  const white = kit.mat("#ffffff");

  // ---------- legs: shorts, rolled cuffs, shins, socks, chunky high-tops
  [-1, 1].forEach((side) => {
    const x = side * 0.23;
    put(kit.mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.34, 18), shorts), x, 0.64, 0, body);
    const roll = kit.mesh(new THREE.TorusGeometry(0.22, 0.06, 10, 22), cuff, 1.06);
    roll.rotation.x = Math.PI / 2;
    put(roll, x, 0.47, 0, body);
    put(kit.mesh(new THREE.CapsuleGeometry(0.12, 0.14, 4, 12), skinMat), x, 0.36, 0, body);
    put(kit.mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16), white, 1.06), x, 0.23, 0, body);
    const shoe = kit.mesh(new THREE.SphereGeometry(0.22, 18, 14), kit.mat("#f2f2f2"), 1.08);
    shoe.scale.set(0.95, 0.72, 1.35);
    put(shoe, x, 0.12, 0.05, body);
    const stripe = kit.mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 22), laneMat, 1.1);
    stripe.rotation.x = Math.PI / 2;
    stripe.scale.set(1, 1.3, 1);
    put(stripe, x, 0.16, 0.05, body);
    const sole = kit.mesh(new THREE.BoxGeometry(0.34, 0.07, 0.56), kit.mat("#2a2f45"), 1.06);
    put(sole, x, 0.02, 0.07, body);
  });

  // ---------- torso: tank top + shorts waist + suspenders
  put(kit.mesh(new THREE.CapsuleGeometry(0.47, 0.3, 6, 20), tank), 0, 1.05, 0, body);
  put(kit.mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 24), shorts, 1.05), 0, 0.8, 0, body);
  [-1, 1].forEach((side) => {
    const front = kit.mesh(new THREE.BoxGeometry(0.09, 0.62, 0.05), strap, 1.12);
    front.rotation.z = side * 0.12;
    put(front, side * 0.2, 1.14, 0.44, body);
    const back = kit.mesh(new THREE.BoxGeometry(0.09, 0.62, 0.05), strap, 1.12);
    back.rotation.z = -side * 0.12;
    put(back, side * 0.2, 1.14, -0.44, body);
    put(kit.mesh(new THREE.SphereGeometry(0.05, 10, 8), kit.mat(skin.gold ? "#fff3b0" : GOLD), 1.2), side * 0.23, 0.9, 0.49, body);
  });

  // ---------- arms: bare, bent, fists on hips (pivot at shoulder, elbow bend inward)
  parts.arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.52, 1.36, 0.02);
    pivot.rotation.z = side * 0.72;
    pivot.userData.base = pivot.rotation.z;
    put(kit.mesh(new THREE.SphereGeometry(0.15, 14, 12), skinMat), 0, 0, 0, pivot); // shoulder
    put(kit.mesh(new THREE.CapsuleGeometry(0.12, 0.26, 4, 12), skinMat), 0, -0.2, 0, pivot);
    const elbow = new THREE.Group();
    elbow.position.y = -0.4;
    elbow.rotation.z = -side * 1.62;
    pivot.add(elbow);
    put(kit.mesh(new THREE.CapsuleGeometry(0.11, 0.24, 4, 12), skinMat), 0, -0.18, 0.02, elbow);
    const band = kit.mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 16), laneMat, 1.1);
    put(band, 0, -0.3, 0.02, elbow);
    put(kit.mesh(new THREE.SphereGeometry(0.15, 16, 12), skinMat), 0, -0.4, 0.04, elbow); // fist
    body.add(pivot);
    return pivot;
  });

  // ---------- head
  const head = new THREE.Group();
  head.position.y = 1.95;
  body.add(head);
  parts.head = head;
  put(kit.mesh(new THREE.SphereGeometry(0.55, 32, 24), skinMat, 1.06), 0, 0, 0, head);
  // ears
  [-1, 1].forEach((side) => put(kit.mesh(new THREE.SphereGeometry(0.1, 12, 10), skinMat, 1.1), side * 0.54, -0.02, 0, head));
  // short dark hair showing under the cap at the sides and back
  const hairMat = kit.mat("#2b1d17");
  const hair = kit.mesh(new THREE.SphereGeometry(0.575, 24, 16, Math.PI * 0.72, Math.PI * 1.56, 0.5, 1.05), hairMat, 1.03);
  put(hair, 0, 0.02, 0, head);
  [-1, 1].forEach((side) => {
    const tuft = kit.mesh(new THREE.ConeGeometry(0.1, 0.24, 8), hairMat, 1.1);
    tuft.rotation.z = side * 2.2;
    put(tuft, side * 0.5, 0.18, 0.12, head);
  });

  // eyes: big dark ovals with a white glint (group scaled for blinking)
  const eyes = new THREE.Group();
  head.add(eyes);
  parts.eyes = eyes;
  [-0.2, 0.2].forEach((x) => {
    const eye = kit.mesh(new THREE.SphereGeometry(0.1, 18, 14), kit.mat("#16121f"), 1.14);
    eye.scale.set(0.85, 1.25, 0.5);
    put(eye, x, 0.05, 0.49, eyes);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), kit.glow("#ffffff"));
    kit.owned.push(glint.geometry);
    put(glint, x + 0.03, 0.1, 0.54, eyes);
  });
  if (sleeping) eyes.scale.y = 0.08;

  // confident brows: thick, angled down toward the nose
  const browMat = kit.mat("#2b1d17");
  [-1, 1].forEach((side) => {
    const brow = kit.mesh(new THREE.BoxGeometry(0.2, 0.06, 0.05), browMat, 1.1);
    brow.rotation.z = sleeping ? side * 0.05 : side * 0.3;
    put(brow, side * 0.21, 0.24, 0.5, head);
  });

  // mouth: a wide toothy grin (or a small sleepy one)
  if (sleeping) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.02, 6, 12, Math.PI), kit.mat("#7a2331"));
    kit.owned.push(m.geometry);
    m.rotation.z = Math.PI;
    put(m, 0, -0.2, 0.53, head);
  } else {
    const grin = kit.mesh(new THREE.SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), white, 1.1);
    grin.scale.set(1, 0.55, 0.45);
    grin.rotation.z = 0.08;
    put(grin, 0.03, -0.14, 0.44, head);
    const gap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.02), kit.mat("#c9c9c9"));
    kit.owned.push(gap.geometry);
    put(gap, 0.03, -0.18, 0.53, head);
  }
  // cheek + chin shape
  put(kit.mesh(new THREE.SphereGeometry(0.07, 10, 8), skinMat, 0), 0, -0.02, 0.55, head); // nose

  let hatTop = 0.74;
  if (sleeping) {
    const cap = kit.mesh(new THREE.ConeGeometry(0.52, 0.85, 24), kit.mat("#4c5bd4"));
    cap.rotation.z = -0.5;
    put(cap, 0.12, 0.62, 0, head);
    put(kit.mesh(new THREE.SphereGeometry(0.12, 12, 10), kit.mat("#ffffff")), 0.48, 0.92, 0, head);
    hatTop = 1.0;
  } else {
    // sporty cap in the lane colour: crown, white band, forward brim
    const crown = kit.mesh(new THREE.SphereGeometry(0.6, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), laneMat, 1.05);
    crown.scale.set(1, 0.72, 1);
    put(crown, 0, 0.27, -0.02, head);
    const bandCap = kit.mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 28, 1, true), kit.mat("#ffffff"), 1.04);
    put(bandCap, 0, 0.3, -0.02, head);
    const brim = kit.mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 28, 1, false, -Math.PI / 2, Math.PI), kit.mat(darken(color, 0.3)), 1.08);
    brim.rotation.x = 0.12;
    put(brim, 0, 0.3, 0.34, head);
    put(kit.mesh(new THREE.SphereGeometry(0.06, 10, 8), kit.mat(darken(color, 0.3)), 1.15), 0, 0.71, -0.02, head); // button
  }

  // ---------- Trophy Road skins
  if (skin.star) {
    const star = kit.mesh(new THREE.ExtrudeGeometry(starShape(0.13, 0.055), { depth: 0.04, bevelEnabled: false }), kit.mat(GOLD), 1.12);
    put(star, 0, 1.2, 0.45, body);
  }
  if (skin.crown) {
    const crown = new THREE.Group();
    const gold = kit.mat(GOLD);
    crown.add(kit.mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.18, 24, 1, true), gold, 1.06));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spike = kit.mesh(new THREE.ConeGeometry(0.07, 0.2, 10), gold, 1.12);
      spike.position.set(Math.cos(a) * 0.27, 0.17, Math.sin(a) * 0.27);
      crown.add(spike);
    }
    put(kit.mesh(new THREE.SphereGeometry(0.06, 12, 10), kit.glow("#ff3b5c"), 1.2), 0, 0.02, 0.29, crown);
    crown.position.y = hatTop;
    head.add(crown);
  }
  if (skin.aura || skin.blaze) {
    const ringMat = kit.glow(skin.blaze ? "#ff8a1f" : lighten(color, 0.35));
    ringMat.transparent = true;
    ringMat.opacity = 0.85;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.045, 8, 48), ringMat);
    kit.owned.push(ring.geometry);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    root.add(ring);
    parts.aura = ring;
  }
  if (skin.diamond) {
    const orbit = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const gem = kit.mesh(new THREE.OctahedronGeometry(0.12), kit.glow("#7df9ff"), 1.15);
      const a = (i / 3) * Math.PI * 2;
      gem.position.set(Math.cos(a) * 1.05, 1.3 + (i % 2) * 0.3, Math.sin(a) * 1.05);
      orbit.add(gem);
    }
    root.add(orbit);
    parts.orbit = orbit;
  }
  return parts;
}

// ---------- scene + controller

export function createArena(container, opts = {}) {
  const reduced = !!opts.reducedMotion;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = "arena-canvas";
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 1.85, 6.1);
  camera.lookAt(0, 1.32, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a4a8a, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 6, 5);
  scene.add(sun);

  // platform
  const baseKit = new Kit();
  const platform = new THREE.Group();
  const top = baseKit.mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.28, 48), baseKit.mat("#2b3a8f"), 1.04);
  top.position.y = -0.14;
  platform.add(top);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.05, 8, 64), baseKit.glow("#ffd23f"));
  baseKit.owned.push(rim.geometry);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.01;
  platform.add(rim);
  scene.add(platform);

  let kit = null, parts = null, key = "";
  let spin = 0.35, spinVel = 0, lastDrag = 0;
  let look = { x: 0, y: 0 }, lookT = { x: 0, y: 0 };
  let jumpStart = -1, nextBlink = 2, blinkUntil = 0, mood = "work";
  let raf = 0, active = false, visible = true;
  const clock = new THREE.Clock();

  function resize() {
    const w = container.clientWidth || 300, h = container.clientHeight || 220;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    draw(true);
  }

  function show(o) {
    const k = [o.lane, o.mood, Object.keys(o.skin || {}).sort().join(",")].join("|");
    if (k === key) return;
    key = k;
    mood = o.mood || "work";
    if (parts) { scene.remove(parts.root); kit.dispose(); }
    kit = new Kit();
    parts = buildCharacter(kit, o.lane, o.skin || {}, mood);
    parts.root.rotation.y = spin;
    scene.add(parts.root);
    rim.material.color.set(LANE[o.lane] ? lighten(LANE[o.lane], 0.25) : "#ffd23f");
    draw(true);
  }

  function celebrate() {
    jumpStart = clock.getElapsedTime();
    spinVel += 0.35;
    if (reduced) draw(true);
  }

  function step(t, dt) {
    if (!parts) return;
    const sleeping = mood === "sleep";
    // drag inertia, then drift back to a 3/4 view
    spin += spinVel;
    spinVel *= 0.9;
    if (performance.now() - lastDrag > 2500 && Math.abs(spinVel) < 0.002) spin += (0.35 - spin) * Math.min(1, dt * 2);
    parts.root.rotation.y = spin;
    // idle bob / breathing
    const bob = reduced ? 0 : Math.sin(t * (sleeping ? 1.2 : 2.4)) * (sleeping ? 0.03 : 0.05);
    let y = bob;
    if (jumpStart >= 0) {
      const p = (t - jumpStart) / 0.75;
      if (p >= 1) jumpStart = -1;
      else {
        y += Math.sin(Math.PI * p) * 0.85;
        parts.body.rotation.y = p * Math.PI * 2;
        parts.arms.forEach((a, i) => { a.rotation.z = a.userData.base + (i ? 1 : -1) * Math.sin(Math.PI * p) * 1.4; });
      }
    }
    if (jumpStart < 0) {
      parts.body.rotation.y = 0;
      parts.arms.forEach((a, i) => { a.rotation.z = a.userData.base + (reduced ? 0 : (i ? 1 : -1) * Math.sin(t * 2.4) * 0.03); });
    }
    parts.body.position.y = y;
    // head follows the pointer
    look.x += (lookT.x - look.x) * Math.min(1, dt * 6);
    look.y += (lookT.y - look.y) * Math.min(1, dt * 6);
    parts.head.rotation.y = look.x * 0.55;
    parts.head.rotation.x = -look.y * 0.3 + (sleeping ? 0.25 : 0);
    // blink
    if (!sleeping && !reduced) {
      if (t > nextBlink) { blinkUntil = t + 0.12; nextBlink = t + 2.5 + Math.random() * 3; }
      parts.eyes.scale.y = t < blinkUntil ? 0.1 : 1;
    }
    if (parts.aura) { parts.aura.rotation.z = t * 1.5; parts.aura.material.opacity = 0.6 + Math.sin(t * 3) * 0.25; }
    if (parts.orbit) parts.orbit.rotation.y = t * 1.2;
    rim.rotation.z = t * 0.3;
  }

  function draw(force) {
    if (!force && (!active || !visible)) return;
    renderer.render(scene, camera);
  }

  function loop() {
    raf = 0;
    if (!active || !visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    step(clock.getElapsedTime(), dt);
    draw();
    // With reduced motion, only keep animating while something is moving.
    if (!reduced || jumpStart >= 0 || Math.abs(spinVel) > 0.001) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && active && visible) { clock.getDelta(); raf = requestAnimationFrame(loop); } }

  function setActive(on) { active = on; if (on) { resize(); kick(); } }

  // ---------- pointer: drag to spin, tap to celebrate, hover to make it look at you
  let down = null;
  canvas.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    lookT.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    lookT.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    if (down) {
      const dx = e.clientX - down.x;
      if (Math.abs(dx) > 6) down.moved = true;
      if (down.moved) { spinVel = dx * 0.004; spin += dx * 0.012; down.x = e.clientX; lastDrag = performance.now(); }
    }
    kick();
  });
  const end = (e) => {
    if (down && !down.moved && e.type === "pointerup") {
      celebrate();
      if (opts.onTap) opts.onTap();
    }
    down = null;
    kick();
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("pointerleave", () => { lookT.x = 0; lookT.y = 0; kick(); });

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); });
  io.observe(container);

  return {
    show,
    celebrate: () => { celebrate(); kick(); },
    setActive,
    dispose() {
      active = false;
      ro.disconnect(); io.disconnect();
      if (kit) kit.dispose();
      baseKit.dispose();
      renderer.dispose();
      canvas.remove();
    }
  };
}
