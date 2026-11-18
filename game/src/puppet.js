// The puppet painter: every wayang figure is drawn procedurally — an ornate
// near-black silhouette edged in gold, with a profile face, a headdress per
// hero, articulated arms, a weapon, and the dalang's control rods. Poses come
// from the fighter's state, so attacks, blocks, hits and KOs all read as
// puppet theatre, never as a static cutout.
import { PALETTE } from './config.js';

const INK = '#150b05';
const INK_EDGE = '#000000';

function limb(ctx, x0, y0, x1, y1, w0, w1, fill, stroke) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * 0.5;
  const ny = (dx / len) * 0.5;
  ctx.beginPath();
  ctx.moveTo(x0 + nx * w0, y0 + ny * w0);
  ctx.lineTo(x1 + nx * w1, y1 + ny * w1);
  ctx.lineTo(x1 - nx * w1, y1 - ny * w1);
  ctx.lineTo(x0 - nx * w0, y0 - ny * w0);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function goldDot(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.goldBright;
  ctx.fill();
}

// Headdress variants, drawn in head-local coordinates (head top at y=0).
function drawCrown(ctx, art, boss) {
  ctx.fillStyle = INK;
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1.4;
  const crown = art.crown;
  ctx.beginPath();
  if (crown === 'tiara') {
    ctx.moveTo(-10, 4);
    ctx.lineTo(-8, -12);
    ctx.lineTo(-3, -4);
    ctx.lineTo(0, -16);
    ctx.lineTo(3, -4);
    ctx.lineTo(8, -12);
    ctx.lineTo(10, 4);
    ctx.closePath();
  } else if (crown === 'band') {
    ctx.rect(-10, -4, 20, 7);
  } else if (crown === 'bun') {
    ctx.moveTo(-10, 4);
    ctx.quadraticCurveTo(-12, -8, -4, -10);
    ctx.quadraticCurveTo(2, -12, 6, -6);
    ctx.lineTo(10, 4);
    ctx.closePath();
  } else if (crown === 'wings') {
    ctx.moveTo(-10, 4);
    ctx.quadraticCurveTo(-22, -10, -30, -8);
    ctx.quadraticCurveTo(-20, -2, -12, 2);
    ctx.lineTo(-8, -12);
    ctx.lineTo(0, -16);
    ctx.lineTo(8, -12);
    ctx.lineTo(10, 4);
    ctx.closePath();
  } else if (crown === 'tail') {
    ctx.moveTo(-10, 4);
    ctx.quadraticCurveTo(-8, -8, 0, -9);
    ctx.quadraticCurveTo(8, -8, 10, 4);
    ctx.closePath();
  } else if (crown === 'peacock') {
    ctx.moveTo(-10, 4);
    ctx.quadraticCurveTo(-6, -10, 0, -11);
    ctx.quadraticCurveTo(6, -10, 10, 4);
    ctx.closePath();
  } else {
    // Demon crown: tall, horned, with face bumps for Rahwana.
    ctx.moveTo(-13, 5);
    ctx.lineTo(-16, -14);
    ctx.lineTo(-8, -6);
    ctx.lineTo(-4, -22);
    ctx.lineTo(0, -8);
    ctx.lineTo(4, -22);
    ctx.lineTo(8, -6);
    ctx.lineTo(16, -14);
    ctx.lineTo(13, 5);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
  if (crown === 'peacock') {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -10);
    ctx.quadraticCurveTo(10, -26, 18, -30);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(19, -31, 5, 7, 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#2e86ab';
    ctx.fill();
    goldDot(ctx, 19, -31, 2);
  }
  if (crown === 'tiara' || crown === 'demon') {
    for (let i = 0; i < art.crownSpikes; i += 1) goldDot(ctx, -6 + i * 6, -6, 1.4);
  }
  if (boss) {
    // Three small demon faces ride the crown's wings.
    for (const fx of [-14, 0, 14]) {
      ctx.beginPath();
      ctx.arc(fx, -2, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = '#3a0a08';
      ctx.fill();
      ctx.strokeStyle = PALETTE.ember;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  if (art.plume) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.quadraticCurveTo(-14, -22, -10, -30);
    ctx.stroke();
  }
}

function drawWeapon(ctx, weapon, hx, hy, angle, scale, accent) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  ctx.fillStyle = INK;
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1.4;
  if (weapon === 'bow') {
    ctx.beginPath();
    ctx.arc(0, 0, 34 * scale, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(30 * scale, -22 * scale);
    ctx.lineTo(30 * scale, 22 * scale);
    ctx.strokeStyle = PALETTE.cream;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(30 * scale, 0);
    ctx.lineTo(52 * scale, 0);
    ctx.stroke();
  } else if (weapon === 'mace') {
    ctx.fillRect(-4, -6, 46 * scale, 7);
    ctx.beginPath();
    ctx.arc(50 * scale, -2, 13 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(50 * scale + Math.cos(a) * 12 * scale, -2 + Math.sin(a) * 12 * scale);
      ctx.lineTo(50 * scale + Math.cos(a) * 19 * scale, -2 + Math.sin(a) * 19 * scale);
      ctx.stroke();
    }
  } else if (weapon === 'twin') {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, side * 6);
      ctx.quadraticCurveTo(26 * scale, side * 2, 40 * scale, side * 8);
      ctx.quadraticCurveTo(26 * scale, side * 12, 0, side * 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (weapon === 'spear') {
    ctx.fillRect(-14, -3, 74 * scale, 5);
    ctx.beginPath();
    ctx.moveTo(60 * scale, -8);
    ctx.lineTo(80 * scale, 0);
    ctx.lineTo(60 * scale, 7);
    ctx.closePath();
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fill();
  } else if (weapon === 'staff') {
    ctx.fillRect(-30, -4, 84 * scale, 6);
    goldDot(ctx, 54 * scale, -1, 5);
    ctx.strokeStyle = PALETTE.ember;
    ctx.beginPath();
    ctx.arc(54 * scale, -1, 8, 0, Math.PI * 2);
    ctx.stroke();
  } else if (weapon === 'flute') {
    ctx.fillRect(-6, -3, 40 * scale, 6);
    ctx.fillStyle = accent;
    ctx.fillRect(8, -3, 5, 6);
    ctx.fillRect(18, -3, 5, 6);
    ctx.fillRect(28, -3, 5, 6);
  } else {
    // Sword: a broad curved blade for the demon king.
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.quadraticCurveTo(44 * scale, -16, 66 * scale, -4);
    ctx.quadraticCurveTo(44 * scale, 4, 0, 6);
    ctx.closePath();
    ctx.fillStyle = '#2a2a33';
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// Pose solver: returns lean, crouch, arm angles and weapon angle for a fighter.
function solvePose(fighter, time) {
  const pose = fighter.pose;
  const t = fighter.poseT;
  const attack = fighter.attack;
  const progress = attack ? Math.min(1, t / (attack.startup + attack.active + attack.recovery)) : 0;
  const active = attack ? t >= attack.startup && t <= attack.startup + attack.active : false;
  const sway = Math.sin(time * 2.2 + fighter.x * 0.01) * 0.03;
  const solved = {
    lean: sway,
    squash: 1,
    backArm: 1.15 + sway,
    frontArm: 0.95 + sway,
    frontElbow: 0.5,
    weaponAngle: 0.15,
    legSpread: 26,
    headTilt: 0,
    jumpTuck: 0,
  };
  if (pose === 'walk') {
    solved.legSpread = 34 + Math.sin(time * 10) * 6;
    solved.lean = 0.08;
  } else if (pose === 'jump') {
    solved.jumpTuck = 1;
    solved.frontArm = 0.5;
    solved.lean = -0.06;
  } else if (pose === 'crouch' || pose === 'block') {
    solved.squash = 0.78;
    solved.legSpread = 40;
    solved.frontArm = 1.85;
    solved.frontElbow = 1.5;
    solved.weaponAngle = -0.4;
  } else if (pose === 'dash') {
    solved.lean = 0.3;
    solved.legSpread = 44;
    solved.frontArm = 0.4;
  } else if (pose === 'light' || pose === 'heavy' || pose === 'special') {
    if (attack && t < attack.startup) {
      // Wind-up: arm draws back.
      const w = t / Math.max(0.01, attack.startup);
      solved.frontArm = 0.95 + w * 0.7;
      solved.lean = -0.1 * w;
      solved.weaponAngle = 0.15 + w * 0.5;
    } else if (active) {
      // Strike: arm snaps forward.
      solved.frontArm = -0.25;
      solved.frontElbow = 0.08;
      solved.lean = 0.22;
      solved.weaponAngle = -0.08;
      solved.legSpread = 40;
    } else {
      // Recovery: arm drifts back.
      solved.frontArm = -0.25 + progress * 1.1;
      solved.lean = 0.22 - progress * 0.2;
    }
    if (pose === 'special') {
      solved.frontArm = -0.9;
      solved.backArm = -0.7;
      solved.weaponAngle = -0.5;
      solved.lean = 0.1;
    }
  } else if (pose === 'hit') {
    solved.lean = -0.28;
    solved.frontArm = 1.6;
    solved.backArm = 1.7;
    solved.headTilt = -0.15;
  } else if (pose === 'blockstun') {
    solved.lean = -0.14;
    solved.frontArm = 1.85;
    solved.frontElbow = 1.5;
  } else if (pose === 'win') {
    solved.frontArm = -1.9;
    solved.backArm = 0.6;
    solved.lean = -0.08;
    solved.weaponAngle = -0.9;
  } else if (pose === 'ko') {
    solved.lean = -0.5;
    solved.frontArm = 1.9;
    solved.backArm = 2.1;
  } else if (pose === 'intro') {
    solved.frontArm = 0.6;
    solved.lean = 0.05;
  }
  return solved;
}

export function drawPuppet(ctx, fighter, time, opts) {
  const options = opts ?? {};
  const def = fighter.def;
  const art = def.art;
  const H = fighter.height;
  const scale = H / 190;
  const flash = fighter.flashT > 0;
  const fill = flash ? '#ffe9b0' : INK;
  const pose = solvePose(fighter, time);
  const facing = fighter.facing;
  const koFall = fighter.pose === 'ko' ? Math.min(1, fighter.koT * 1.6) : 0;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  // Ground shadow: a soft dark ellipse the puppet stands on.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 52 * scale * art.bulk, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(facing * scale, scale);
  ctx.translate(0, -koFall * 6);
  ctx.rotate(pose.lean - koFall * 0.9);
  ctx.scale(1, pose.squash);

  // Back control rod (behind the body).
  ctx.strokeStyle = 'rgba(154, 116, 34, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, -H * 0.32);
  ctx.lineTo(-20, 34);
  ctx.stroke();

  // Tail for Hanoman.
  if (art.crown === 'tail') {
    ctx.strokeStyle = fill;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-8, -H * 0.42);
    ctx.quadraticCurveTo(-44, -H * 0.5 + Math.sin(time * 3) * 6, -52, -H * 0.72);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, -H * 0.42);
    ctx.quadraticCurveTo(-44, -H * 0.5 + Math.sin(time * 3) * 6, -52, -H * 0.72);
    ctx.stroke();
  }

  // Legs: stylised stance, front leg forward.
  const hipY = -H * 0.44;
  const spread = pose.legSpread;
  const tuck = pose.jumpTuck;
  ctx.fillStyle = fill;
  ctx.strokeStyle = PALETTE.goldDim;
  ctx.lineWidth = 1;
  limb(ctx, -4, hipY, -spread * 0.7, -6 - tuck * 14, 11, 7, fill, PALETTE.goldDim);
  limb(ctx, 4, hipY, spread * 0.8, -4 - tuck * 22, 11, 7, fill, PALETTE.goldDim);
  // Feet: pointed slippers.
  ctx.beginPath();
  ctx.moveTo(-spread * 0.7 - 8, -6 - tuck * 14);
  ctx.lineTo(-spread * 0.7 + 12, -6 - tuck * 14);
  ctx.lineTo(-spread * 0.7 + 16, 0 - tuck * 14);
  ctx.lineTo(-spread * 0.7 - 8, 0 - tuck * 14);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(spread * 0.8 - 6, -4 - tuck * 22);
  ctx.lineTo(spread * 0.8 + 14, -4 - tuck * 22);
  ctx.lineTo(spread * 0.8 + 18, 2 - tuck * 22);
  ctx.lineTo(spread * 0.8 - 6, 2 - tuck * 22);
  ctx.closePath();
  ctx.fill();

  // Long cloth from waist to near the ground, with gold hem dots.
  const waistY = -H * 0.47;
  const clothW = 30 * art.bulk;
  ctx.beginPath();
  ctx.moveTo(-clothW * 0.5, waistY);
  ctx.quadraticCurveTo(-clothW * 0.8, waistY + H * 0.24, -clothW * 0.62, -8);
  ctx.lineTo(clothW * 0.62, -8);
  ctx.quadraticCurveTo(clothW * 0.8, waistY + H * 0.24, clothW * 0.5, waistY);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.35)';
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * clothW * 0.18, waistY + 4);
    ctx.lineTo(i * clothW * 0.26, -10);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i += 1) goldDot(ctx, -clothW * 0.5 + i * clothW * 0.25, -13, 1.5);

  // Torso: slim, chest forward.
  const shoulderY = -H + 34;
  ctx.beginPath();
  ctx.moveTo(-13 * art.bulk, shoulderY + 6);
  ctx.quadraticCurveTo(-16 * art.bulk, waistY - 14, -10 * art.bulk, waistY);
  ctx.lineTo(12 * art.bulk, waistY);
  ctx.quadraticCurveTo(16 * art.bulk, waistY - 20, 12 * art.bulk, shoulderY + 2);
  ctx.quadraticCurveTo(6, shoulderY - 6, -4, shoulderY - 4);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Sash: diagonal band in the puppet's accent colour.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-13 * art.bulk, shoulderY + 6);
  ctx.quadraticCurveTo(-16 * art.bulk, waistY - 14, -10 * art.bulk, waistY);
  ctx.lineTo(12 * art.bulk, waistY);
  ctx.quadraticCurveTo(16 * art.bulk, waistY - 20, 12 * art.bulk, shoulderY + 2);
  ctx.quadraticCurveTo(6, shoulderY - 6, -4, shoulderY - 4);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = def.sash;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(-18, shoulderY + 2);
  ctx.lineTo(18, waistY - 2);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-18, shoulderY - 4);
  ctx.lineTo(18, waistY - 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-18, shoulderY + 8);
  ctx.lineTo(18, waistY + 4);
  ctx.stroke();
  ctx.restore();

  // Belt and chest ornament.
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(-12 * art.bulk, waistY - 3, 24 * art.bulk, 5);
  goldDot(ctx, 4, shoulderY + 16, 3);
  ctx.strokeStyle = PALETTE.goldDim;
  ctx.beginPath();
  ctx.arc(4, shoulderY + 16, 5.5, 0, Math.PI * 2);
  ctx.stroke();

  // Shoulder spikes for the demon king.
  if (def.boss) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = PALETTE.ember;
    ctx.lineWidth = 1.2;
    for (const sx of [-14, 14]) {
      ctx.beginPath();
      ctx.moveTo(sx - 5, shoulderY + 4);
      ctx.lineTo(sx, shoulderY - 16);
      ctx.lineTo(sx + 5, shoulderY + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // Head: the wayang profile — long nose, single gold eye.
  const headY = -H + 14;
  ctx.save();
  ctx.translate(2, headY);
  ctx.rotate(pose.headTilt);
  ctx.beginPath();
  ctx.moveTo(-9, -10);
  ctx.quadraticCurveTo(-2, -14, 6, -11);
  ctx.lineTo(11, -6);
  ctx.lineTo(17, -1);
  ctx.lineTo(10, 2);
  ctx.lineTo(13, 5);
  ctx.lineTo(8, 9);
  ctx.lineTo(0, 12);
  ctx.lineTo(-7, 10);
  ctx.quadraticCurveTo(-11, 0, -9, -10);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Eye: gold, or burning red for the boss.
  ctx.beginPath();
  ctx.arc(6, -4, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = def.boss ? PALETTE.ember : PALETTE.goldBright;
  ctx.fill();
  // Ear ornament.
  goldDot(ctx, -5, 2, 2);
  // Headdress sits on the head's top.
  ctx.translate(0, -12);
  drawCrown(ctx, art, Boolean(def.boss));
  ctx.restore();

  // Arms: back arm first (dimmer), then the weapon arm.
  const shoulder = { x: 0, y: shoulderY + 4 };
  const armLen = 34 * art.armLength;
  const foreLen = 30 * art.armLength;
  function arm(angle, elbow, weapon, alpha) {
    const ex = shoulder.x + Math.cos(angle) * armLen;
    const ey = shoulder.y + Math.sin(angle) * armLen;
    const handAngle = angle + elbow;
    const hx = ex + Math.cos(handAngle) * foreLen;
    const hy = ey + Math.sin(handAngle) * foreLen;
    ctx.globalAlpha = alpha;
    limb(ctx, shoulder.x, shoulder.y, ex, ey, 9, 7, fill, PALETTE.goldDim);
    limb(ctx, ex, ey, hx, hy, 7, 5, fill, PALETTE.goldDim);
    goldDot(ctx, ex, ey, 2);
    ctx.beginPath();
    ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.globalAlpha = 1;
    return { hx, hy, handAngle };
  }
  arm(pose.backArm + 0.25, 0.7, null, 0.55);
  const front = arm(pose.frontArm, pose.frontElbow, def.art.weapon, 1);
  if (def.art.weapon) {
    drawWeapon(ctx, def.art.weapon, front.hx, front.hy, front.handAngle + pose.weaponAngle, 1, def.accent);
  }

  // Front control rod from the weapon hand down past the feet.
  ctx.strokeStyle = 'rgba(154, 116, 34, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(front.hx, front.hy);
  ctx.lineTo(front.hx + 6, 40);
  ctx.stroke();

  // Armor aura while a special grants it.
  if (fighter.armorT > 0) {
    ctx.strokeStyle = `rgba(255, 224, 138, ${0.35 + 0.3 * Math.sin(time * 12)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -H * 0.5, H * 0.62, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Mirage afterimages for Hanoman's special.
  if (options.mirages) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    for (const off of [-46, 46]) {
      ctx.save();
      ctx.translate(off, 0);
      ctx.globalAlpha = 0.22;
      drawPuppetSilhouette(ctx, fighter, time);
      ctx.restore();
    }
    ctx.restore();
  }
}

// A cheap silhouette copy used for afterimages: the same painter, one level
// down, with no rods or weapons, so it never recurses.
function drawPuppetSilhouette(ctx, fighter, time) {
  const H = fighter.height;
  const scale = H / 190;
  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.scale(fighter.facing * scale, scale);
  ctx.fillStyle = '#3a2a18';
  ctx.beginPath();
  ctx.ellipse(0, -H * 0.5, 26, H * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4, -H + 12, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A still portrait for the select strip: a synthetic idle fighter.
export function drawPortrait(ctx, def, cx, cy, height, time) {
  const fake = {
    def,
    x: cx,
    y: cy,
    facing: 1,
    height,
    pose: 'idle',
    poseT: 0,
    attack: null,
    flashT: 0,
    armorT: 0,
    koT: 0,
    width: 64 * def.art.bulk,
  };
  drawPuppet(ctx, fake, time + cx * 0.001, {});
}
