// The world behind the puppets: five painted backdrops, the glowing kelir
// screen, the carved frame with gunungan ornaments, and the gamelan orchestra
// in silhouette along the foot of the screen. All procedural, all deterministic.
import { GROUND_Y, VIEW_H, VIEW_W } from './config.js';

function gradientSky(ctx, stage) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, stage.sky[0]);
  grad.addColorStop(0.55, stage.sky[1]);
  grad.addColorStop(1, stage.sky[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function screenGlow(ctx, stage, time) {
  // The lamp behind the kelir: a warm radial bloom, gently breathing.
  const pulse = 1 + Math.sin(time * 0.8) * 0.04;
  const glow = ctx.createRadialGradient(VIEW_W / 2, 330, 60, VIEW_W / 2, 330, 560 * pulse);
  glow.addColorStop(0, stage.glow);
  glow.addColorStop(0.55, 'rgba(255, 180, 90, 0.35)');
  glow.addColorStop(1, 'rgba(255, 180, 90, 0)');
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalAlpha = 1;
}

function silhouettes(ctx, color, shapes) {
  ctx.fillStyle = color;
  for (const shape of shapes) {
    ctx.beginPath();
    ctx.moveTo(shape[0][0], shape[0][1]);
    for (let i = 1; i < shape.length; i += 1) ctx.lineTo(shape[i][0], shape[i][1]);
    ctx.closePath();
    ctx.fill();
  }
}

function drawForest(ctx, stage, time) {
  const far = [];
  for (let i = 0; i < 9; i += 1) {
    const x = 40 + i * 145;
    const h = 240 + ((i * 37) % 90);
    far.push([[x, GROUND_Y], [x + 26, GROUND_Y - h], [x + 52, GROUND_Y]]);
    far.push([[x + 10, GROUND_Y - h * 0.55], [x + 26, GROUND_Y - h - 30], [x + 42, GROUND_Y - h * 0.55]]);
  }
  silhouettes(ctx, 'rgba(16, 10, 4, 0.75)', far);
  const near = [];
  for (let i = 0; i < 6; i += 1) {
    const x = 90 + i * 210;
    near.push([[x, GROUND_Y + 4], [x + 14, GROUND_Y - 190], [x + 30, GROUND_Y + 4]]);
  }
  silhouettes(ctx, 'rgba(10, 6, 2, 0.9)', near);
  // Fireflies drift between the trees.
  for (let i = 0; i < 14; i += 1) {
    const fx = (i * 173 + Math.sin(time * 0.7 + i) * 30 + 1200) % VIEW_W;
    const fy = 200 + ((i * 89) % 260) + Math.cos(time * 0.9 + i * 2) * 14;
    ctx.beginPath();
    ctx.arc(fx, fy, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 230, 140, ${0.35 + 0.4 * Math.abs(Math.sin(time * 1.4 + i))})`;
    ctx.fill();
  }
}

function drawPalace(ctx, stage) {
  for (let i = 0; i < 5; i += 1) {
    const x = 90 + i * 275;
    ctx.fillStyle = 'rgba(12, 6, 16, 0.85)';
    ctx.fillRect(x, 120, 46, GROUND_Y - 120);
    ctx.fillStyle = 'rgba(232, 180, 255, 0.25)';
    ctx.fillRect(x - 6, 108, 58, 16);
    ctx.fillRect(x - 6, GROUND_Y - 16, 58, 16);
    ctx.fillStyle = '#ffd977';
    ctx.beginPath();
    ctx.arc(x + 23, 150, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(232, 180, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 118);
  ctx.lineTo(VIEW_W, 118);
  ctx.stroke();
  // Hanging lamps.
  for (let i = 0; i < 4; i += 1) {
    const x = 220 + i * 280;
    ctx.strokeStyle = 'rgba(255, 217, 119, 0.5)';
    ctx.beginPath();
    ctx.moveTo(x, 118);
    ctx.lineTo(x, 168);
    ctx.stroke();
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.moveTo(x - 10, 168);
    ctx.lineTo(x + 10, 168);
    ctx.lineTo(x + 6, 186);
    ctx.lineTo(x - 6, 186);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBattlefield(ctx, stage, time) {
  // Torn banners on leaning poles, drifting smoke.
  for (let i = 0; i < 5; i += 1) {
    const x = 120 + i * 260;
    const lean = (i % 2 === 0 ? 1 : -1) * 8;
    ctx.strokeStyle = 'rgba(10, 5, 2, 0.9)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x + lean, GROUND_Y - 260);
    ctx.stroke();
    ctx.fillStyle = 'rgba(140, 30, 18, 0.85)';
    ctx.beginPath();
    ctx.moveTo(x + lean, GROUND_Y - 260);
    ctx.lineTo(x + lean + 74, GROUND_Y - 244);
    ctx.lineTo(x + lean + 62, GROUND_Y - 214);
    ctx.lineTo(x + lean, GROUND_Y - 226);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 8; i += 1) {
    const sx = (i * 211 + time * 12) % (VIEW_W + 200) - 100;
    const sy = 300 + ((i * 67) % 160);
    ctx.fillStyle = 'rgba(60, 30, 18, 0.16)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, 70, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Broken spears stuck in the ground.
  ctx.strokeStyle = 'rgba(10, 5, 2, 0.85)';
  ctx.lineWidth = 4;
  for (const [x, h, tilt] of [[300, 70, 0.3], [700, 52, -0.25], [980, 78, 0.2], [520, 44, 0.4]]) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 2);
    ctx.lineTo(x + tilt * h, GROUND_Y - h);
    ctx.stroke();
  }
}

function drawCliff(ctx, stage, time) {
  // Layered sea: three bands of rolling wave silhouettes.
  for (let band = 0; band < 3; band += 1) {
    ctx.fillStyle = ['rgba(8, 28, 46, 0.9)', 'rgba(16, 52, 78, 0.85)', 'rgba(24, 74, 102, 0.8)'][band];
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    const baseY = 430 + band * 48;
    for (let x = 0; x <= VIEW_W; x += 16) {
      ctx.lineTo(x, baseY + Math.sin(x * 0.02 + time * 1.2 + band * 2) * 8);
    }
    ctx.lineTo(VIEW_W, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }
  // Cliff rock on the right, gulls overhead.
  ctx.fillStyle = 'rgba(8, 12, 16, 0.95)';
  ctx.beginPath();
  ctx.moveTo(VIEW_W, GROUND_Y);
  ctx.lineTo(VIEW_W, 300);
  ctx.quadraticCurveTo(1120, 330, 1080, 420);
  ctx.quadraticCurveTo(1050, 500, 1090, GROUND_Y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 243, 214, 0.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) {
    const gx = (i * 300 + time * 22) % (VIEW_W + 120) - 60;
    const gy = 150 + i * 34 + Math.sin(time * 2 + i) * 8;
    ctx.beginPath();
    ctx.moveTo(gx - 10, gy);
    ctx.quadraticCurveTo(gx - 4, gy - 6, gx, gy);
    ctx.quadraticCurveTo(gx + 4, gy - 6, gx + 10, gy);
    ctx.stroke();
  }
}

function drawUnderworld(ctx, stage, time) {
  // Bone-white dead trees and rising soul motes.
  for (let i = 0; i < 6; i += 1) {
    const x = 100 + i * 220;
    ctx.strokeStyle = 'rgba(230, 210, 200, 0.5)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.quadraticCurveTo(x + 10, GROUND_Y - 150, x - 6, GROUND_Y - 240);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 4, GROUND_Y - 140);
    ctx.lineTo(x + 44, GROUND_Y - 190);
    ctx.moveTo(x + 2, GROUND_Y - 180);
    ctx.lineTo(x - 38, GROUND_Y - 220);
    ctx.stroke();
  }
  for (let i = 0; i < 16; i += 1) {
    const mx = (i * 167) % VIEW_W;
    const my = GROUND_Y - ((time * 26 + i * 53) % 420);
    ctx.beginPath();
    ctx.arc(mx, my, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 77, 106, ${0.25 + 0.35 * Math.abs(Math.sin(time + i))})`;
    ctx.fill();
  }
  // Lava glow along the ground line.
  const lava = ctx.createLinearGradient(0, GROUND_Y - 26, 0, GROUND_Y + 10);
  lava.addColorStop(0, 'rgba(255, 60, 30, 0)');
  lava.addColorStop(1, 'rgba(255, 60, 30, 0.5)');
  ctx.fillStyle = lava;
  ctx.fillRect(0, GROUND_Y - 26, VIEW_W, 36);
}

function drawGround(ctx, stage) {
  ctx.fillStyle = stage.ground;
  ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
  ctx.fillStyle = 'rgba(255, 200, 110, 0.12)';
  ctx.fillRect(0, GROUND_Y, VIEW_W, 3);
  // Woven mat stripes on the floor.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  for (let x = 0; x < VIEW_W; x += 64) ctx.fillRect(x, GROUND_Y + 14, 30, 4);
}

export function drawStage(ctx, stage, time) {
  gradientSky(ctx, stage);
  if (stage.id === 'forest') drawForest(ctx, stage, time);
  else if (stage.id === 'palace') drawPalace(ctx, stage, time);
  else if (stage.id === 'battlefield') drawBattlefield(ctx, stage, time);
  else if (stage.id === 'cliff') drawCliff(ctx, stage, time);
  else drawUnderworld(ctx, stage, time);
  screenGlow(ctx, stage, time);
  drawGround(ctx, stage);
}

// The carved wooden frame of the kelir screen, with gunungan mountain
// ornaments at both sides and a gold inner border.
export function drawFrame(ctx, time) {
  ctx.fillStyle = '#1d0f06';
  ctx.fillRect(0, 0, VIEW_W, 26);
  ctx.fillRect(0, VIEW_H - 22, VIEW_W, 22);
  ctx.fillRect(0, 0, 26, VIEW_H);
  ctx.fillRect(VIEW_W - 26, 0, 26, VIEW_H);
  ctx.strokeStyle = '#9a7422';
  ctx.lineWidth = 2;
  ctx.strokeRect(26, 26, VIEW_W - 52, VIEW_H - 48);
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, VIEW_W - 60, VIEW_H - 56);
  // Carved dots along the top and bottom rails.
  ctx.fillStyle = '#f2c14e';
  for (let x = 48; x < VIEW_W - 40; x += 44) {
    ctx.beginPath();
    ctx.arc(x, 13, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, VIEW_H - 11, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Gunungan ornaments: mountain-and-flame silhouettes at mid-height, both sides.
  for (const side of [0, 1]) {
    const cx = side === 0 ? 13 : VIEW_W - 13;
    ctx.save();
    ctx.translate(cx, 330);
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.quadraticCurveTo(11, -18, 8, 30);
    ctx.quadraticCurveTo(4, 52, 0, 58);
    ctx.quadraticCurveTo(-4, 52, -8, 30);
    ctx.quadraticCurveTo(-11, -18, 0, -52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1d0f06';
    ctx.beginPath();
    ctx.arc(0, -26, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 30, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// The gamelan orchestra in silhouette along the foot of the screen: hanging
// gongs, kettle drums and seated players with mallets, gently bobbing.
export function drawGamelan(ctx, time) {
  const baseY = VIEW_H - 22;
  ctx.fillStyle = 'rgba(8, 4, 2, 0.92)';
  // Hanging gong frame, left.
  ctx.fillRect(60, baseY - 74, 8, 74);
  ctx.fillRect(150, baseY - 74, 8, 74);
  ctx.fillRect(56, baseY - 78, 106, 8);
  for (const gx of [84, 116, 148]) {
    ctx.beginPath();
    ctx.arc(gx, baseY - 46, 15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 10, 4, 0.95)';
    ctx.fill();
    ctx.strokeStyle = '#9a7422';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(gx, baseY - 46, 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Metallophone rows, centre-left and centre-right.
  for (const [x0, keys] of [[220, 7], [880, 7]]) {
    ctx.fillStyle = 'rgba(8, 4, 2, 0.92)';
    ctx.fillRect(x0, baseY - 34, keys * 26 + 8, 34);
    for (let k = 0; k < keys; k += 1) {
      ctx.fillStyle = k % 2 === 0 ? '#8a6a24' : '#6b531c';
      ctx.fillRect(x0 + 6 + k * 26, baseY - 44, 20, 12);
    }
  }
  // Kettle drums, right.
  for (const dx of [1090, 1140, 1186]) {
    ctx.fillStyle = 'rgba(8, 4, 2, 0.92)';
    ctx.beginPath();
    ctx.ellipse(dx, baseY - 30, 24, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(dx - 24, baseY - 30, 48, 28);
    ctx.strokeStyle = '#9a7422';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(dx, baseY - 30, 24, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Seated players with mallets, bobbing to the beat.
  for (let i = 0; i < 4; i += 1) {
    const px = 330 + i * 200;
    const bob = Math.sin(time * 2.4 + i * 1.7) * 2;
    ctx.fillStyle = 'rgba(8, 4, 2, 0.95)';
    ctx.beginPath();
    ctx.arc(px, baseY - 52 + bob, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px - 14, baseY - 2);
    ctx.quadraticCurveTo(px - 16, baseY - 40 + bob, px, baseY - 42 + bob);
    ctx.quadraticCurveTo(px + 16, baseY - 40 + bob, px + 14, baseY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(154, 116, 34, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px + 10, baseY - 34 + bob);
    ctx.lineTo(px + 26, baseY - 52 + bob - Math.sin(time * 4.8 + i) * 6);
    ctx.stroke();
  }
}
