/* Arena mascots — original low-poly cartoon characters drawn with Three.js.
 * One mascot per lane (outfit + prop), upgraded by Trophy Road skins.
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
const STEEL = "#cfd8e6";

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

// ---------- character

function buildCharacter(kit, lane, skin, mood) {
  const color = LANE[lane] || LANE.routine;
  const metal = skin.gold ? GOLD : STEEL;
  const root = new THREE.Group();   // drag rotation
  const body = new THREE.Group();   // bob / jump
  root.add(body);
  const parts = { root, body };

  // legs + shoes
  const pants = kit.mat(darken(color, 0.55));
  const shoe = kit.mat(INK);
  [-0.22, 0.22].forEach((x) => {
    const leg = kit.mesh(new THREE.CapsuleGeometry(0.16, 0.22, 4, 12), pants);
    leg.position.set(x, 0.36, 0);
    body.add(leg);
    const foot = kit.mesh(new THREE.SphereGeometry(0.2, 16, 12), shoe, 1.1);
    foot.scale.set(1, 0.6, 1.35);
    foot.position.set(x, 0.1, 0.06);
    body.add(foot);
  });

  // torso + chest plate
  const torso = kit.mesh(new THREE.CapsuleGeometry(0.5, 0.32, 6, 20), kit.mat(color));
  torso.position.y = 0.98;
  body.add(torso);
  const plate = kit.mesh(new THREE.SphereGeometry(0.34, 20, 14), kit.mat(lighten(color, 0.5)), 1.06);
  plate.scale.set(1, 0.85, 0.35);
  plate.position.set(0, 1.0, 0.4);
  body.add(plate);
  if (skin.gold) {
    const belt = kit.mesh(new THREE.TorusGeometry(0.5, 0.06, 10, 32), kit.mat(GOLD), 1.1);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.72;
    body.add(belt);
  }

  // arms (pivot at shoulder) + hands
  const sleeve = kit.mat(color);
  const hand = kit.mat(SKIN_TONE);
  parts.arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.58, 1.28, 0);
    const arm = kit.mesh(new THREE.CapsuleGeometry(0.13, 0.32, 4, 12), sleeve);
    arm.position.y = -0.26;
    pivot.add(arm);
    const h = kit.mesh(new THREE.SphereGeometry(0.15, 16, 12), hand);
    h.position.y = -0.55;
    pivot.add(h);
    pivot.rotation.z = side * 0.28;
    body.add(pivot);
    return pivot;
  });
  const rightHand = new THREE.Group();
  rightHand.position.y = -0.55;
  parts.arms[1].add(rightHand);

  // head
  const head = new THREE.Group();
  head.position.y = 1.86;
  body.add(head);
  parts.head = head;
  head.add(kit.mesh(new THREE.SphereGeometry(0.56, 32, 24), kit.mat(SKIN_TONE), 1.06));

  // eyes (group scaled for blinking), brows, mouth
  const eyes = new THREE.Group();
  head.add(eyes);
  parts.eyes = eyes;
  const white = kit.mat("#ffffff");
  const pupil = kit.mat(INK);
  [-0.2, 0.2].forEach((x) => {
    const eye = kit.mesh(new THREE.SphereGeometry(0.15, 20, 16), white, 1.12);
    eye.scale.set(0.9, 1.1, 0.55);
    eye.position.set(x, 0.06, 0.47);
    eyes.add(eye);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), pupil);
    kit.owned.push(p.geometry);
    p.position.set(x + (x < 0 ? 0.015 : -0.015), 0.05, 0.55);
    eyes.add(p);
  });
  if (mood === "sleep") eyes.scale.y = 0.08;
  const browMat = kit.mat(INK);
  [-1, 1].forEach((side) => {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.05), browMat);
    kit.owned.push(brow.geometry);
    brow.position.set(side * 0.2, 0.27, 0.48);
    brow.rotation.z = side * (mood === "sleep" ? 0.05 : -0.22);
    head.add(brow);
  });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 20, Math.PI), kit.mat("#7a2331"));
  kit.owned.push(mouth.geometry);
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, -0.17, 0.52);
  if (mood === "sleep") mouth.scale.set(0.5, 0.4, 1);
  head.add(mouth);

  let hatTop = 0.56; // where a crown sits
  const put = (obj, x, y, z, parent = head) => { obj.position.set(x, y, z); parent.add(obj); return obj; };
  const hair = (c) => {
    const h = kit.mesh(new THREE.SphereGeometry(0.58, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2.3), kit.mat(c), 1.04);
    h.rotation.x = -0.25;
    return put(h, 0, 0.04, -0.04);
  };

  // ---------- lane outfits
  if (mood === "sleep") {
    const cap = kit.mesh(new THREE.ConeGeometry(0.5, 0.8, 24), kit.mat("#4c5bd4"));
    cap.rotation.z = -0.5;
    put(cap, 0.12, 0.62, 0);
    put(kit.mesh(new THREE.SphereGeometry(0.12, 12, 10), kit.mat("#ffffff")), 0.47, 0.9, 0);
    hatTop = 1.0;
  } else if (lane === "ai") {
    hair("#2a3550");
    const stem = kit.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), kit.mat(metal), 1.3);
    put(stem, 0, 0.72, 0);
    put(kit.mesh(new THREE.SphereGeometry(0.1, 16, 12), kit.glow(lighten(color, 0.3)), 1.25), 0, 0.95, 0);
    [-1, 1].forEach((s) => {
      const ear = kit.mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 20), kit.mat(color));
      ear.rotation.z = Math.PI / 2;
      put(ear, s * 0.56, 0.02, 0);
    });
    hatTop = 1.05;
  } else if (lane === "cs") {
    const frame = kit.mat(INK);
    [-0.2, 0.2].forEach((x) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 8, 24), frame);
      kit.owned.push(ring.geometry);
      put(ring, x, 0.06, 0.55);
    });
    const chip = kit.mesh(new THREE.BoxGeometry(0.34, 0.34, 0.06), kit.mat("#1f7a45"), 1.1);
    put(chip, 0, 1.02, 0.52, body);
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.02), kit.glow("#b8ffcf"));
    kit.owned.push(core.geometry);
    put(core, 0, 1.02, 0.56, body);
    hair("#3b2a1f");
  } else if (lane === "project") {
    const hat = kit.mesh(new THREE.SphereGeometry(0.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(skin.gold ? GOLD : "#ffd23f"));
    put(hat, 0, 0.12, 0);
    const brim = kit.mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.06, 28), kit.mat(skin.gold ? GOLD : "#ffd23f"));
    put(brim, 0, 0.14, 0.05);
    const handle = kit.mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), kit.mat(metal), 1.2);
    handle.position.y = -0.1;
    rightHand.add(handle);
    const jaw = kit.mesh(new THREE.TorusGeometry(0.1, 0.045, 8, 16, Math.PI * 1.5), kit.mat(metal), 1.2);
    jaw.position.y = -0.45;
    rightHand.add(jaw);
    hatTop = 0.72;
  } else if (lane === "dsa") {
    hair("#1d1d2e");
    const band = kit.mesh(new THREE.TorusGeometry(0.56, 0.06, 10, 32), kit.mat("#e2364b"), 1.08);
    band.rotation.x = Math.PI / 2 - 0.15;
    put(band, 0, 0.22, 0);
    const blade = kit.mesh(new THREE.BoxGeometry(0.1, 0.95, 0.04), kit.mat(skin.gold ? GOLD : STEEL), 1.15);
    blade.position.set(0, -0.62, 0.12);
    rightHand.add(blade);
    const guard = kit.mesh(new THREE.BoxGeometry(0.34, 0.07, 0.1), kit.mat(GOLD), 1.15);
    guard.position.set(0, -0.12, 0.12);
    rightHand.add(guard);
    parts.arms[1].rotation.x = -0.9;
  } else if (lane === "research") {
    hair("#f2f2f2");
    const band = kit.mesh(new THREE.TorusGeometry(0.57, 0.04, 8, 32), kit.mat(INK), 1.05);
    band.rotation.x = Math.PI / 2 - 0.3;
    put(band, 0, 0.22, 0);
    [-0.2, 0.2].forEach((x) => {
      const lens = kit.mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 20), kit.mat(lighten(color, 0.4)), 1.12);
      lens.rotation.x = Math.PI / 2 - 0.5;
      put(lens, x, 0.33, 0.44);
    });
    const flask = kit.mesh(new THREE.SphereGeometry(0.17, 18, 14), kit.glow(lighten(color, 0.2)), 1.12);
    flask.position.set(0, -0.2, 0.1);
    rightHand.add(flask);
    const neck = kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 10), kit.mat("#e8f4ff"), 1.2);
    neck.position.set(0, -0.02, 0.1);
    rightHand.add(neck);
  } else if (lane === "kaggle") {
    const cap = kit.mesh(new THREE.SphereGeometry(0.58, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat(darken(color, 0.15)));
    cap.scale.y = 0.75;
    put(cap, 0, 0.24, 0);
    const brim = kit.mesh(new THREE.BoxGeometry(0.5, 0.05, 0.35), kit.mat(darken(color, 0.35)));
    put(brim, 0, 0.26, -0.62);
    const medal = kit.mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 24), kit.mat(GOLD), 1.15);
    medal.rotation.x = Math.PI / 2;
    put(medal, 0, 1.12, 0.5, body);
    hatTop = 0.66;
  } else if (lane === "sd") {
    const beret = kit.mesh(new THREE.SphereGeometry(0.55, 24, 12), kit.mat(color));
    beret.scale.set(1.05, 0.35, 1.05);
    beret.rotation.z = 0.25;
    put(beret, 0.08, 0.45, 0);
    const roll = kit.mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.7, 14), kit.mat("#4f8df5"), 1.15);
    roll.rotation.x = Math.PI / 2;
    roll.position.set(0, -0.05, 0.1);
    rightHand.add(roll);
    hatTop = 0.62;
  } else if (lane === "ielts") {
    const arc = kit.mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 28, Math.PI), kit.mat(INK), 1.1);
    put(arc, 0, 0.02, 0);
    [-1, 1].forEach((s) => {
      const cup = kit.mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.16, 20), kit.mat(color));
      cup.rotation.z = Math.PI / 2;
      put(cup, s * 0.6, 0.02, 0);
    });
    hatTop = 0.7;
  } else {
    const beanie = kit.mesh(new THREE.SphereGeometry(0.59, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), kit.mat("#e2566b"));
    put(beanie, 0, 0.1, 0);
    put(kit.mesh(new THREE.SphereGeometry(0.13, 12, 10), kit.mat("#ffffff")), 0, 0.72, 0);
    hatTop = 0.84;
  }

  // ---------- Trophy Road skins
  if (skin.star) {
    const star = kit.mesh(new THREE.ExtrudeGeometry(starShape(0.16, 0.07), { depth: 0.05, bevelEnabled: false }), kit.mat(GOLD), 1.12);
    put(star, -0.26, 1.22, 0.42, body);
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
    crown.position.y = hatTop + 0.06;
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
  camera.position.set(0, 1.8, 6.6);
  camera.lookAt(0, 1.2, 0);
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
        parts.arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * (0.28 + Math.sin(Math.PI * p) * 1.9); });
      }
    }
    if (jumpStart < 0) {
      parts.body.rotation.y = 0;
      if (!reduced) parts.arms[0].rotation.z = -0.28 - Math.sin(t * 2.4) * 0.06;
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
