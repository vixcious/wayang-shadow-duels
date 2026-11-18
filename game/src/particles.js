// Particles, floating damage numbers and screen shake: the feedback layer.
// State only — the renderer draws it — so the sim and the screenshots share it.
export function createParticles() {
  return {
    sparks: [],
    dust: [],
    texts: [],
    rings: [],
    shakeT: 0,
    shakeMag: 0,
  };
}

export function spawnHitSparks(particles, x, y, power, finisher) {
  const count = finisher ? 26 : power === 'heavy' ? 18 : 14;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 90 + Math.random() * (finisher ? 420 : 280);
    particles.sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      life: 0.35 + Math.random() * 0.3,
      maxLife: 0.65,
      size: 2.5 + Math.random() * (finisher ? 5 : 4),
      gold: Math.random() < 0.7,
    });
  }
  if (finisher || power === 'heavy') {
    particles.rings.push({ x, y, r: 12, life: 0.3, maxLife: 0.3 });
  }
}

export function spawnBlockSparks(particles, x, y) {
  for (let i = 0; i < 7; i += 1) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
    const speed = 120 + Math.random() * 160;
    particles.sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.25 + Math.random() * 0.2,
      maxLife: 0.45,
      size: 2 + Math.random() * 2,
      gold: false,
    });
  }
}

export function spawnDust(particles, x, y, count) {
  for (let i = 0; i < (count ?? 5); i += 1) {
    particles.dust.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y - Math.random() * 6,
      vx: (Math.random() - 0.5) * 70,
      vy: -20 - Math.random() * 40,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      size: 4 + Math.random() * 7,
    });
  }
}

export function spawnShockwave(particles, x, y) {
  particles.rings.push({ x, y, r: 20, life: 0.45, maxLife: 0.45 });
  spawnDust(particles, x, y, 12);
}

export function addFloatingText(particles, x, y, text, color, size) {
  // Jitter the spawn point, then stack: a new number landing on top of a live
  // one rises above it, so a combo's numbers stay readable instead of
  // collapsing into one blot.
  const jitteredX = x + (Math.random() - 0.5) * 48;
  let stackedY = y + (Math.random() - 0.5) * 16;
  for (const other of particles.texts) {
    if (Math.abs(other.x - jitteredX) < 46 && Math.abs(other.y - stackedY) < 26) stackedY -= 26;
  }
  particles.texts.push({
    x: jitteredX,
    y: stackedY,
    text,
    color,
    size: size ?? 26,
    life: 0.9,
    maxLife: 0.9,
  });
  if (particles.texts.length > 8) particles.texts.splice(0, particles.texts.length - 8);
}

export function addShake(particles, magnitude, time) {
  particles.shakeMag = Math.max(particles.shakeMag, magnitude);
  particles.shakeT = Math.max(particles.shakeT, time);
}

export function stepParticles(particles, dt) {
  for (const spark of particles.sparks) {
    spark.life -= dt;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vy += 620 * dt;
  }
  particles.sparks = particles.sparks.filter((spark) => spark.life > 0);
  for (const puff of particles.dust) {
    puff.life -= dt;
    puff.x += puff.vx * dt;
    puff.y += puff.vy * dt;
    puff.vy -= 30 * dt;
  }
  particles.dust = particles.dust.filter((puff) => puff.life > 0);
  for (const text of particles.texts) {
    text.life -= dt;
    text.y -= 55 * dt;
  }
  particles.texts = particles.texts.filter((text) => text.life > 0);
  for (const ring of particles.rings) {
    ring.life -= dt;
    ring.r += 340 * dt;
  }
  particles.rings = particles.rings.filter((ring) => ring.life > 0);
  particles.shakeT = Math.max(0, particles.shakeT - dt);
  if (particles.shakeT <= 0) particles.shakeMag = 0;
}

// Turn a duel's fx events into particles, floating text and shake. Both the
// live game and the screenshot stager call this, so staged frames show exactly
// what real play shows.
export function applyFxEvents(particles, fxList) {
  for (const fx of fxList) {
    if (fx.type === 'hit') {
      spawnHitSparks(particles, fx.x, fx.y, fx.power, fx.finisher);
      addFloatingText(particles, fx.x, fx.y - 30, String(fx.damage), fx.finisher ? '#ffe08a' : '#fff3d6', fx.finisher ? 34 : 24);
      addShake(particles, fx.finisher ? 12 : fx.power === 'heavy' ? 7 : 4, 0.25);
    } else if (fx.type === 'block') {
      spawnBlockSparks(particles, fx.x, fx.y);
      addFloatingText(particles, fx.x, fx.y - 26, 'BLOCK', '#7fd4ff', 18);
    } else if (fx.type === 'shockwave') {
      spawnShockwave(particles, fx.x, fx.y);
      addShake(particles, 10, 0.3);
    }
  }
}

export function shakeOffset(particles) {
  if (particles.shakeT <= 0) return { x: 0, y: 0 };
  const mag = particles.shakeMag * (particles.shakeT / 0.3);
  return { x: (Math.random() - 0.5) * 2 * mag, y: (Math.random() - 0.5) * 2 * mag };
}
