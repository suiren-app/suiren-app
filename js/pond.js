// Suiren home page pond. The koi are a port of the app's KoiArt (look), KoiNode (pose) and
// KoiBrain (behaviour), so they swim the way they do in the app. Tap the water to drop food.
(() => {
"use strict";
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };

/* ---------- Koi, ported from the app: KoiArt (look), KoiNode (pose) and KoiBrain (behaviour) ---------- */
// Patches: u = distance back from the head as a fraction of length, v = across the body (-1..1),
// s = size against body width, st = how long the patch is.
const GENOMES = [
  { base: "#f6efe4", fin: "#f3ece2", patches: [{ c: "#d9442a", u: .14, v: .1, s: .85, st: 1.5 }, { c: "#d9442a", u: .42, v: -.2, s: .95, st: 1.7 }, { c: "#d9442a", u: .68, v: .25, s: .7, st: 1.4 }] },
  { base: "#f6efe4", fin: "#f3ece2", patches: [{ c: "#dc4b2c", u: .16, v: -.1, s: .8, st: 1.5 }, { c: "#dc4b2c", u: .5, v: .2, s: .85, st: 1.6 }, { c: "#1c1918", u: .36, v: -.5, s: .32, st: 1.2 }, { c: "#1c1918", u: .7, v: .45, s: .28, st: 1.3 }, { c: "#1c1918", u: .58, v: -.35, s: .22, st: 1 }] },
  { base: "#f2a93b", fin: "#f6c463", metallic: true, patches: [] },
  { base: "#f26b33", fin: "#f7a46f", patches: [{ c: "#f8efe2", u: .46, v: .35, s: .65, st: 1.5 }, { c: "#f8efe2", u: .74, v: -.3, s: .5, st: 1.3 }] },
  { base: "#1e1b1b", fin: "#2b2626", patches: [{ c: "#d8432a", u: .18, v: .15, s: .9, st: 1.6 }, { c: "#f2ebdf", u: .46, v: -.4, s: .6, st: 1.4 }, { c: "#d8432a", u: .62, v: .3, s: .75, st: 1.5 }] },
  { base: "#f7f2e9", fin: "#f3ede4", patches: [{ c: "#d63a24", u: .11, v: 0, s: .62, st: 1 }] },
  { base: "#bf8146", fin: "#d9a06a", patches: [{ c: "#d79a5a", u: .42, v: 0, s: .8, st: 2.2 }] },
];
// KoiBrain.Tuning.forPersonality, in points per second at the app's standard 95 pt koi.
const PERSONALITY = {
  calm:    { cruise: 32, dart: 85,  turn: 1.3, accel: 30, rest: [1.5, 4], burst: 0 },
  curious: { cruise: 42, dart: 160, turn: 2.4, accel: 80, rest: [0.6, 2], burst: 0.1 },
  playful: { cruise: 55, dart: 140, turn: 3.0, accel: 90, rest: [0.2, 1], burst: 0.35 },
};
const PERS = Object.keys(PERSONALITY);
const SHADOW = { x: 0.53, y: 0.848, dist: 9.43, alpha: 0.22 }; // PondLight.shadowDirection, KoiNode.shadowOffset
const INK_STRENGTH = 1;
const ART_SCALE = Math.min(2, devicePixelRatio || 1);

function mixWhite(hex, k) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return [r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k].map(Math.round);
}
function bodyPath(c, tailX, headX, midY, hw) {
  const len = headX - tailX, ped = hw * 0.22, widest = tailX + len * 0.62;
  c.beginPath(); c.moveTo(tailX, midY - ped);
  c.bezierCurveTo(tailX + len * .25, midY - ped * 1.1, tailX + len * .4, midY - hw, widest, midY - hw);
  c.bezierCurveTo(tailX + len * .86, midY - hw, headX, midY - hw * .55, headX, midY);
  c.bezierCurveTo(headX, midY + hw * .55, tailX + len * .86, midY + hw, widest, midY + hw);
  c.bezierCurveTo(tailX + len * .4, midY + hw, tailX + len * .25, midY + ped * 1.1, tailX, midY + ped);
  c.closePath();
}
function canvasOf(w, h, draw) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w * ART_SCALE)); cv.height = Math.max(1, Math.ceil(h * ART_SCALE));
  const c = cv.getContext("2d"); c.scale(ART_SCALE, ART_SCALE); draw(c);
  return cv;
}
function finFill(c, path, base, tip, rays, rgb, ink) {
  c.save(); path(); c.clip();
  const g = c.createLinearGradient(base[0], base[1], tip[0], tip[1]);
  if (ink) { g.addColorStop(0, `rgba(${ink},0.42)`); g.addColorStop(1, `rgba(${ink},0.06)`); }
  else { g.addColorStop(0, `rgba(${rgb},0.85)`); g.addColorStop(1, `rgba(${rgb},0.3)`); }
  c.fillStyle = g; c.fillRect(-999, -999, 3000, 3000);
  c.strokeStyle = ink ? `rgba(${ink},0.18)` : "rgba(0,0,0,0.12)"; c.lineWidth = 0.8;
  const len = Math.hypot(tip[0] - base[0], tip[1] - base[1]);
  for (let i = 0; i < rays; i++) {
    const a = Math.PI + (i / Math.max(rays - 1, 1) - 0.5) * 1.3;
    c.beginPath(); c.moveTo(base[0], base[1]); c.lineTo(base[0] + Math.cos(a) * len * 1.2, base[1] + Math.sin(a) * len * 1.2); c.stroke();
  }
  c.restore();
}
// KoiArt: one body image (split at the joint when drawn), a forked tail fin and a side fin.
function makeArt(g, L, ink) {
  const P = 2, W = L * 0.27, hw = W / 2;
  const bw = L + P * 2, bh = W + P * 2, headX = P + L, midY = bh / 2;
  const tw = L * 0.32, th = W * 1.3, fw = L * 0.17, fh = W * 0.38;
  const rgb = mixWhite(g.fin, g.fin === "#2b2626" ? 0.1 : 0.3).join(",");
  const body = canvasOf(bw, bh, c => {
    bodyPath(c, P, headX, midY, hw);
    if (ink) {
      // Opaque wash (ink mixed into the paper), so the two body halves don't darken where they overlap.
      const paper = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim();
      const pn = parseInt(paper.slice(1), 16), pr = [pn >> 16, (pn >> 8) & 255, pn & 255], ir = ink.split(",").map(Number);
      const wash = k => (k *= INK_STRENGTH, `rgb(${ir.map((v, i) => Math.round(pr[i] + (v - pr[i]) * k)).join(",")})`);
      const gr = c.createLinearGradient(headX, 0, P, 0);
      gr.addColorStop(0, wash(0.85)); gr.addColorStop(0.6, wash(0.55)); gr.addColorStop(1, wash(0.28));
      c.fillStyle = gr; c.fill(); return;
    }
    c.save(); c.clip();
    c.fillStyle = g.base; c.fillRect(0, 0, bw, bh);
    for (const p of g.patches) {
      c.fillStyle = p.c;
      for (const [du, dv, k] of [[0, 0, 1], [0.05, 0.25, 0.7], [-0.05, -0.2, 0.65]]) {
        const ry = p.s * k * W * 0.55, rx = ry * p.st;
        c.beginPath(); c.ellipse(headX - (p.u + du) * L, midY + (p.v + dv) * hw, rx, ry, 0, 0, TAU); c.fill();
      }
    }
    c.fillStyle = `rgba(${rgb},0.22)`; c.beginPath(); c.ellipse(headX - L * 0.52, midY, L * 0.2, W * 0.06, 0, 0, TAU); c.fill();
    let gr = c.createLinearGradient(0, midY - hw, 0, midY + hw);
    gr.addColorStop(0, "rgba(0,0,0,0.3)"); gr.addColorStop(0.35, "rgba(0,0,0,0)"); gr.addColorStop(0.65, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.3)");
    c.fillStyle = gr; c.fillRect(0, 0, bw, bh);
    const sheen = g.metallic ? 0.5 : 0.18;
    gr = c.createLinearGradient(0, midY - hw, 0, midY + hw);
    gr.addColorStop(0.3, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(255,255,255,${sheen})`); gr.addColorStop(0.7, "rgba(255,255,255,0)");
    c.fillStyle = gr; c.fillRect(0, 0, bw, bh);
    c.restore();
    const er = Math.max(1.6, W * 0.065) * Math.min(1, L / 60 + 0.2), ex = headX - L * 0.09;
    for (const s of [-1, 1]) {
      c.fillStyle = "rgb(20,20,20)"; c.beginPath(); c.arc(ex, midY + s * hw * 0.6, er, 0, TAU); c.fill();
      c.fillStyle = "rgba(255,255,255,0.8)"; c.beginPath(); c.arc(ex + er * 0.2, midY + s * hw * 0.6 - er * 0.4, er * 0.25, 0, TAU); c.fill();
    }
    bodyPath(c, P, headX, midY, hw); c.strokeStyle = "rgba(0,0,0,0.2)"; c.lineWidth = 0.8; c.stroke();
  });
  const sil = (w, h, path) => canvasOf(w, h, c => { path(c); c.fillStyle = "#000"; c.fill(); });
  const tailPath = (c) => {
    const x = 1, y = 1, mid = th / 2 + 1, base = th * 0.12;
    c.beginPath(); c.moveTo(x + tw, mid - base);
    c.quadraticCurveTo(x + tw * .55, mid - th * .45, x, y);
    c.quadraticCurveTo(x + tw * .15, mid - th * .12, x + tw * .38, mid);
    c.quadraticCurveTo(x + tw * .15, mid + th * .12, x, y + th);
    c.quadraticCurveTo(x + tw * .55, mid + th * .45, x + tw, mid + base);
    c.closePath();
  };
  const finPath = (c) => { c.beginPath(); c.ellipse(fw / 2 + 1, fh / 2 + 1, fw / 2, fh / 2, 0, 0, TAU); };
  const tail = canvasOf(tw + 2, th + 2, c => finFill(c, () => tailPath(c), [tw + 1, th / 2 + 1], [1, th / 2 + 1], 7, rgb, ink));
  const fin = canvasOf(fw + 2, fh + 2, c => finFill(c, () => finPath(c), [fw + 2, fh / 2 + 1], [0, fh / 2 + 1], 4, rgb, ink));
  return {
    L, W, P, bw, bh, tw: tw + 2, th: th + 2, fw: fw + 2, fh: fh + 2, body, tail, fin,
    bodySil: sil(bw, bh, c => bodyPath(c, P, headX, midY, hw)), tailSil: sil(tw + 2, th + 2, tailPath), finSil: sil(fw + 2, fh + 2, finPath),
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
class Koi {
  constructor(o) {
    this.x = o.x; this.y = o.y; this.heading = o.heading ?? rnd(0, TAU);
    this.g = o.genome ?? GENOMES[(o.variety ?? Math.floor(Math.random() * GENOMES.length)) % GENOMES.length];
    this.t = PERSONALITY[o.personality ?? PERS[Math.floor(Math.random() * PERS.length)]];
    this.ink = o.ink || null;
    this.speed = 0; this.turnRate = 0; this.mode = "rest"; this.restLeft = rnd(0, 1.5); this.target = null; this.legSpeed = 0;
    this.phase = rnd(0, TAU); this.bend = 0; this.rearRot = 0; this.tailRot = 0; this.finSpread = 0.55; this.alpha = o.alpha ?? 1;
    this.setLen(o.len ?? 95);
  }
  setLen(L) {
    if (this.art && Math.abs(L - this.art.L) / this.art.L < 0.05) return;
    this.art = makeArt(this.g, L, this.ink); this.s = L / 95;
  }
  get cruise() { return this.t.cruise * this.s; }
  startLeg(area, toward) {
    const m = Math.min(60, area.w * 0.15);
    this.target = toward ?? { x: rnd(area.x + m, area.x + area.w - m), y: rnd(area.y + m, area.y + area.h - m) };
    this.legSpeed = Math.random() < this.t.burst ? this.cruise * 2 : this.cruise;
    this.mode = "wander";
  }
  rest() { this.mode = "rest"; this.target = null; this.restLeft = rnd(this.t.rest[0], this.t.rest[1]); }
  approach(d, dt) { const step = this.t.accel * this.s * dt; this.speed += clamp(d - this.speed, -step * 1.5, step); }
  update(dt, w) {
    if (dt <= 0) return;
    // Food: eat whatever is by the head, then swim for the nearest pellet.
    if (w.food && w.food.length) {
      const reach = Math.max(10, this.art.L * 0.14);
      const hx = this.x + Math.cos(this.heading) * this.art.L * 0.4, hy = this.y + Math.sin(this.heading) * this.art.L * 0.4;
      let best = null, bd = 1e9;
      for (const f of w.food) { if (f.eaten) continue; const d = Math.hypot(f.x - hx, f.y - hy); if (d < reach) { f.eaten = true; w.ripple?.(f.x, f.y, 0.5); continue; } if (d < bd) { bd = d; best = f; } }
      if (best && bd < 520) { this.mode = "feed"; this.target = best; this.legSpeed = this.t.dart * this.s * 0.6; }
      else if (this.mode === "feed") this.rest();
    } else if (this.mode === "feed") this.rest();
    if (w.follow) { this.mode = "follow"; this.target = w.follow; this.legSpeed = this.t.dart * this.s * 0.8; }
    if (w.nudge && this.mode !== "feed") this.startLeg(w.area, w.nudge(this));

    if (this.mode === "rest") {
      this.restLeft -= dt;
      this.approach(this.cruise * 0.12, dt); this.turnRate = 0;
      if (this.restLeft <= 0) this.startLeg(w.area);
    } else {
      if (!this.target) this.startLeg(w.area);
      // Aim at a point a little ahead of the head, as the app steers its nose.
      const dx = this.target.x - this.x, dy = this.target.y - this.y, dist = Math.hypot(dx, dy);
      const follow = this.mode === "follow";
      if (follow && dist < 26 * this.s + 10) {
        this.approach(this.cruise * 0.15, dt); this.turnRate *= 0.9;
      } else if (!follow && dist < Math.max(8, 12 * this.s)) {
        if (this.mode === "feed") { this.target.eaten = true; w.ripple?.(this.target.x, this.target.y, 0.5); }
        this.rest();
      } else {
        const diff = angDiff(this.heading, Math.atan2(dy, dx));
        const maxTurn = this.t.turn * (follow ? 1.3 : 1) * dt;
        const turn = clamp(diff, -maxTurn, maxTurn);
        this.heading += turn; this.turnRate = turn / dt;
        const turnFactor = 1 - Math.min(Math.abs(diff) / Math.PI, 1) * 0.6;
        const arrive = Math.min(1, dist / (follow ? 140 : 60));
        this.approach(Math.max(this.legSpeed * turnFactor * arrive, this.cruise * 0.3), dt);
      }
    }
    this.x += Math.cos(this.heading) * this.speed * dt;
    this.y += Math.sin(this.heading) * this.speed * dt;
    // KoiNode.applyPose
    const effort = Math.min(this.speed / this.cruise, 3);
    this.phase = (this.phase + TAU * (0.7 + 0.9 * effort) * dt) % TAU;
    const amp = 0.08 + 0.07 * Math.min(effort, 2);
    const targetBend = clamp(-this.turnRate * 0.22, -0.45, 0.45);
    this.bend += (targetBend - this.bend) * Math.min(1, dt * 8);
    this.rearRot = this.bend + Math.sin(this.phase) * amp * 0.6;
    this.tailRot = this.bend * 0.5 + Math.sin(this.phase - 1) * amp * 1.4;
    const spread = 0.55 - 0.35 * Math.min(effort / 2, 1);
    this.finSpread = spread + Math.sin(this.phase * 0.5) * 0.18 * (1 - Math.min(effort / 2.5, 1));
  }
  // The skeleton: fins, then the rear half (bent) with the tail (a beat behind), then the rigid front.
  draw(ctx, sil = false, ox = 0, oy = 0) {
    const a = this.art, L = a.L, jointX = a.P + L * 0.55, ov = Math.min(6, L * 0.06);
    const body = sil ? a.bodySil : a.body, tail = sil ? a.tailSil : a.tail, fin = sil ? a.finSil : a.fin;
    ctx.save(); ctx.translate(this.x + ox, this.y + oy); ctx.rotate(this.heading);
    const finX = L * 0.15;
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(finX, side * a.W * 0.38); ctx.rotate(side < 0 ? this.finSpread : -this.finSpread);
      ctx.drawImage(fin, -a.fw, -a.fh / 2, a.fw, a.fh); ctx.restore();
    }
    ctx.save(); ctx.rotate(this.rearRot);
    ctx.save(); ctx.translate(-(jointX - a.P), 0); ctx.rotate(this.tailRot); ctx.drawImage(tail, 3 - a.tw, -a.th / 2, a.tw, a.th); ctx.restore();
    ctx.beginPath(); ctx.rect(-jointX - 1, -a.bh, jointX + 1 + ov, a.bh * 2); ctx.clip();
    ctx.drawImage(body, -jointX, -a.bh / 2, a.bw, a.bh);
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(-ov, -a.bh, a.bw, a.bh * 2); ctx.clip();
    ctx.drawImage(body, -jointX, -a.bh / 2, a.bw, a.bh);
    ctx.restore();
    ctx.restore();
  }
}
// Shadows go on one layer first, so where two overlap it doesn't darken (KoiNode.shadowLayer).
const shadowLayers = new WeakMap();
function drawKoiWithShadows(ctx, W, H, koi, { alpha = SHADOW.alpha, glow = false } = {}) {
  const dpr = ctx.getTransform().a;
  let shadowLayer = shadowLayers.get(ctx.canvas);
  if (!shadowLayer) { shadowLayer = document.createElement("canvas"); shadowLayers.set(ctx.canvas, shadowLayer); }
  if (shadowLayer.width !== Math.round(W * dpr) || shadowLayer.height !== Math.round(H * dpr)) { shadowLayer.width = Math.round(W * dpr); shadowLayer.height = Math.round(H * dpr); }
  const sc = shadowLayer.getContext("2d"); sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, shadowLayer.width, shadowLayer.height); sc.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const k of koi) { const d = SHADOW.dist * k.s; k.draw(sc, true, SHADOW.x * d, SHADOW.y * d); }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha;
  if ("filter" in ctx) ctx.filter = `blur(${3 * dpr}px)`;
  ctx.drawImage(shadowLayer, 0, 0); ctx.restore();
  for (const k of koi) {
    if (glow) {
      const gr = ctx.createRadialGradient(k.x, k.y, 0, k.x, k.y, k.art.L * 0.9);
      gr.addColorStop(0, "rgba(255,190,110,0.14)"); gr.addColorStop(1, "rgba(255,190,110,0)");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(k.x, k.y, k.art.L * 0.9, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = k.alpha; k.draw(ctx); ctx.globalAlpha = 1;
  }
}

function drawEgg(ctx, x, y, r, t, crack) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 3) * 0.06 * (1 + crack * 3));
  ctx.fillStyle = "rgba(4,20,24,0.18)"; ctx.beginPath(); ctx.ellipse(r * 0.15, r * 0.25, r * 0.85, r * 1.1, 0, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.2);
  g.addColorStop(0, "#fffaf0"); g.addColorStop(1, "#e9dcc4");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.82, r * 1.06, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(232,110,60,0.55)";
  for (const [sx, sy, sr] of [[-.3, -.4, .14], [.25, .1, .18], [-.1, .45, .1], [.35, -.45, .08]]) { ctx.beginPath(); ctx.arc(sx * r, sy * r, sr * r, 0, TAU); ctx.fill(); }
  if (crack > 0) {
    ctx.strokeStyle = "#7a5b45"; ctx.lineWidth = Math.max(1, r * 0.05); ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.05); const k = Math.min(1, crack);
    for (let i = 1; i <= 6; i++) ctx.lineTo(-r * 0.7 + i * r * 0.23 * k, (i % 2 ? -1 : 1) * r * 0.14 - r * 0.05);
    ctx.stroke();
  }
  ctx.restore();
}

function lilyPad(ctx, p, t) {
  ctx.save(); ctx.translate(p.x + Math.sin(t * 0.4 + p.r) * 2, p.y + Math.cos(t * 0.35 + p.r) * 2); ctx.rotate(p.rot + Math.sin(t * 0.2 + p.x) * 0.05);
  ctx.fillStyle = "rgba(4,20,24,0.25)"; ctx.beginPath(); ctx.arc(4, 7, p.r, 0.2, TAU - 0.2); ctx.lineTo(4, 7); ctx.fill();
  const g = ctx.createRadialGradient(-p.r * 0.3, -p.r * 0.3, 2, 0, 0, p.r);
  g.addColorStop(0, "#7fae5a"); g.addColorStop(1, "#4d7d3b");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, p.r, 0.2, TAU - 0.2); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(220,240,190,0.25)"; ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) { const a = 0.5 + i * 0.8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * p.r * 0.85, Math.sin(a) * p.r * 0.85); ctx.stroke(); }
  if (p.flower) {
    ctx.rotate(-p.rot);
    for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * TAU / 8 + t * 0.05); ctx.fillStyle = i % 2 ? "#f6c9d0" : "#f0a9b6"; ctx.beginPath(); ctx.ellipse(p.r * 0.22, 0, p.r * 0.24, p.r * 0.1, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = "#f7d36b"; ctx.beginPath(); ctx.arc(0, 0, p.r * 0.1, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/* ---------- Canvas helper ---------- */
function fit(canvas) {
  const dpr = Math.min(2, devicePixelRatio || 1), r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
  const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/* ---------- A: pond scenes ---------- */
function pondScene(canvas, { count = 6, pads = 5, feed = true, lantern = false, scrim = false } = {}) {
  const world = { food: [], ripples: [], area: { x: 0, y: 0, w: 1, h: 1 } };
  world.ripple = (x, y, s = 1) => world.ripples.push({ x, y, r: 2, life: 1, s });
  let koi = [], lilies = [], W = 0, H = 0, visible = true, t = 0;
  function setup() {
    const f = fit(canvas); W = f.w; H = f.h;
    world.area = { x: 0, y: 0, w: W, h: H };
    const ph = W < 700;
    const c = Math.max(3, Math.round(count * Math.min(1.3, W / 1100 + 0.35)));
    if (koi.length !== c) koi = Array.from({ length: c }, (_, i) => new Koi({ x: rnd(40, W - 40), y: rnd(40, H - 40), len: rnd(78, 112) * (ph ? 0.72 : 1), variety: i }));
    lilies = Array.from({ length: ph ? Math.min(3, pads) : pads }, (_, i) => ({ x: ph ? W * (0.72 + 0.22 * ((i * 0.53) % 1)) : W * (0.55 + 0.42 * ((i * 0.37) % 1)), y: ph ? H * (0.72 + 0.2 * ((i * 0.61) % 1)) : H * (0.12 + 0.8 * ((i * 0.61 + 0.2) % 1)), r: rnd(22, 46) * (ph ? 0.7 : 1), rot: rnd(0, TAU), flower: i % 3 === 0 }));
  }
  setup();
  new ResizeObserver(setup).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  const pt = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  // Listen on the whole hero, not just the canvas: the header and text sit above the
  // canvas and used to swallow taps, so food only landed at the edges.
  const tapArea = canvas.closest(".a-hero, .a-final") || canvas;
  if (feed) tapArea.addEventListener("click", e => {
    if (e.target.closest("a, button, input, select, textarea, label, summary")) return;
    if (String(getSelection?.() || "").length) return;
    const p = pt(e); world.ripple(p.x, p.y, 1.4);
    for (let i = 0; i < 4; i++) world.food.push({ x: p.x + rnd(-22, 22), y: p.y + rnd(-22, 22), born: t });
  });
  const flies = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), p: rnd(0, TAU) }));
  function frame(dt) {
    t += dt;
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
    const cs = getComputedStyle(document.documentElement);
    g.addColorStop(0, cs.getPropertyValue("--water-1").trim() || "#2c6a72"); g.addColorStop(1, cs.getPropertyValue("--water-2").trim() || "#173f4a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) {
      const x = W * (0.2 + 0.3 * i + 0.08 * Math.sin(t * 0.13 + i)), y = H * (0.3 + 0.25 * Math.cos(t * 0.11 + i * 2));
      const rg = ctx.createRadialGradient(x, y, 0, x, y, Math.max(W, H) * 0.35);
      rg.addColorStop(0, "rgba(140,210,200,0.10)"); rg.addColorStop(1, "rgba(140,210,200,0)");
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
    world.food = world.food.filter(f => !f.eaten && t - f.born < 20);
    for (const f of world.food) { ctx.fillStyle = "#c98c4c"; ctx.beginPath(); ctx.arc(f.x, f.y, 3, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(255,240,210,0.5)"; ctx.beginPath(); ctx.arc(f.x - 1, f.y - 1, 1, 0, TAU); ctx.fill(); }
    for (const k of koi) k.update(dt, world);
    drawKoiWithShadows(ctx, W, H, koi, { glow: lantern });
    for (const p of lilies) lilyPad(ctx, p, t);
    world.ripples = world.ripples.filter(r => r.life > 0);
    for (const r of world.ripples) {
      r.r += dt * 60 * r.s; r.life -= dt * 0.7;
      ctx.strokeStyle = `rgba(255,255,255,${0.45 * r.life})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 0.6, 0, TAU); ctx.stroke();
    }
    if (lantern) for (const f of flies) {
      const x = (f.x * W + Math.sin(t * 0.3 + f.p) * 30), y = (f.y * H + Math.cos(t * 0.25 + f.p) * 20), a = 0.4 + 0.4 * Math.sin(t * 2 + f.p);
      ctx.fillStyle = `rgba(255,226,140,${a})`; ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill();
    }
    if (scrim) { const sg = ctx.createLinearGradient(0, 0, W < 700 ? 0 : W * 0.6, W < 700 ? H * 0.8 : 0); sg.addColorStop(0, "rgba(8,28,34,0.42)"); sg.addColorStop(1, "rgba(8,28,34,0)"); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H); }
    if (Math.random() < dt * 0.25) world.ripple(rnd(0, W), rnd(0, H), 0.5);
  }
  return { frame, isOn: () => visible && !document.hidden };
}

function miniScene(canvas, kind) {
  let W = 0, H = 0, t = 0, visible = true, koi = [];
  const w = { area: { x: 0, y: 0, w: 1, h: 1 } };
  function setup() {
    const f = fit(canvas); W = f.w; H = f.h; w.area = { x: 0, y: 0, w: W, h: H };
    if (kind === "grow") koi = [new Koi({ x: W / 2, y: H / 2, len: 40, variety: 0, personality: "curious" })];
    if (kind === "pond") koi = [0, 3, 4].map(v => new Koi({ x: rnd(50, W - 50), y: rnd(40, H - 40), len: rnd(58, 72), variety: v }));
  }
  setup(); new ResizeObserver(setup).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  function frame(dt) {
    t += dt; const ctx = canvas.getContext("2d"); ctx.clearRect(0, 0, W, H);
    if (kind === "egg") {
      const cyc = t % 7, crack = Math.max(0, (cyc - 2.5) / 1.5);
      if (cyc < 4.2) { drawEgg(ctx, W / 2, H / 2, Math.min(W, H) * 0.24, t, crack); koi = []; }
      else {
        if (!koi.length) koi = [new Koi({ x: W / 2, y: H / 2, len: 34, variety: 3, personality: "playful" })];
        koi[0].update(dt, w); drawKoiWithShadows(ctx, W, H, koi);
      }
    } else {
      if (kind === "grow") koi[0].setLen(40 + (Math.sin(t * 0.4) * 0.5 + 0.5) * 50);
      for (const k of koi) k.update(dt, w);
      drawKoiWithShadows(ctx, W, H, koi);
      if (kind === "pond") lilyPad(ctx, { x: W * 0.8, y: H * 0.3, r: 22, rot: 1, flower: true }, t);
    }
  }
  return { frame, isOn: () => visible && !document.hidden };
}

/* ---------- Run ---------- */
const scenes = [];
scenes.push(pondScene(document.getElementById("a-pond"), { count: 7, pads: 6, scrim: true }));
scenes.push(pondScene(document.getElementById("a-final"), { count: 4, pads: 4, lantern: true }));
document.querySelectorAll("canvas[data-mini]").forEach(c => scenes.push(miniScene(c, c.dataset.mini)));

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  for (const s of scenes) if (s.isOn()) s.frame(reduced ? 0.0001 : dt);
  if (!reduced) requestAnimationFrame(loop);
}
// Draw a still frame first so the page is complete at rest, then animate.
for (const s of scenes) { try { for (let i = 0; i < 30; i++) s.frame(0.03); } catch (e) {} }
if (reduced) { setInterval(() => { for (const s of scenes) if (s.isOn()) s.frame(0.0001); }, 500); }
else requestAnimationFrame(loop);

})();
