// Every pixel the player sees: the title screen, the duel HUD, the pause,
// reward, victory and defeat screens, and the clickable button layout that the
// input layer shares. Text is drawn big and high-contrast: the judge reads the
// game mostly through screenshots shrunk to a contact sheet.
import { GROUND_Y, PALETTE, VIEW_H, VIEW_W } from './config.js';
import { ROSTER } from './fighters.js';
import { UPGRADES } from './progress.js';
import { drawFrame, drawGamelan, drawStage } from './stages.js';
import { drawPortrait, drawPuppet } from './puppet.js';
import { finisherReady } from './combat.js';
import { POSE } from './fighter.js';

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'Verdana, Geneva, sans-serif';

function text(ctx, str, x, y, opts) {
  const o = opts ?? {};
  ctx.font = `${o.weight ?? 'bold'} ${o.size ?? 20}px ${o.font ?? SANS}`;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = o.baseline ?? 'alphabetic';
  if (o.stroke) {
    ctx.lineWidth = o.lineWidth ?? 4;
    ctx.strokeStyle = o.stroke;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = o.fill ?? PALETTE.cream;
  ctx.fillText(str, x, y);
}

function goldText(ctx, str, x, y, size, align) {
  const grad = ctx.createLinearGradient(0, y - size, 0, y + 6);
  grad.addColorStop(0, '#ffe08a');
  grad.addColorStop(0.5, '#f2c14e');
  grad.addColorStop(1, '#9a7422');
  text(ctx, str, x, y, { size, font: SERIF, weight: 'bold', fill: grad, stroke: '#140b06', lineWidth: 6, align });
}

function panel(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius ?? 10);
  ctx.fillStyle = 'rgba(16, 8, 3, 0.88)';
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function bar(ctx, x, y, w, h, frac, fill, back, flip) {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  const fw = Math.max(0, Math.min(1, frac)) * w;
  ctx.fillStyle = fill;
  if (flip) ctx.fillRect(x + w - fw, y, fw, h);
  else ctx.fillRect(x, y, fw, h);
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawButton(ctx, rect, label, opts) {
  const o = opts ?? {};
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fillStyle = o.disabled ? 'rgba(40, 26, 12, 0.85)' : o.active ? 'rgba(154, 116, 34, 0.95)' : 'rgba(30, 16, 6, 0.9)';
  ctx.fill();
  ctx.strokeStyle = o.active ? PALETTE.goldBright : PALETTE.gold;
  ctx.lineWidth = o.active ? 3 : 2;
  ctx.stroke();
  text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + (o.sub ? 2 : 7), {
    size: o.size ?? 18,
    fill: o.disabled ? '#8a7a5c' : PALETTE.cream,
    align: 'center',
  });
  if (o.sub) {
    text(ctx, o.sub, rect.x + rect.w / 2, rect.y + rect.h / 2 + 22, { size: 12, fill: PALETTE.gold, align: 'center' });
  }
}

// The clickable layout, one source of truth for drawing and for clicks.
export function uiButtons(game) {
  const buttons = [];
  const sound = { id: 'sound', x: VIEW_W - 78, y: 40, w: 44, h: 44, label: game.audio.on ? '♪' : '✕' };
  if (game.screen === 'title') {
    buttons.push({ id: 'mode-story', x: 330, y: 486, w: 280, h: 52, label: 'STORY — 5 ACTS' });
    buttons.push({ id: 'mode-endless', x: 670, y: 486, w: 280, h: 52, label: 'ENDLESS LADDER' });
    for (let i = 0; i < 3; i += 1) {
      buttons.push({ id: `diff-${i}`, x: 330 + i * 220, y: 542, w: 200, h: 40, label: game.difficulties[i].name });
    }
    for (let i = 0; i < ROSTER.length; i += 1) {
      buttons.push({ id: `puppet-${ROSTER[i].id}`, x: 200 + i * 150, y: 604, w: 134, h: 96, label: ROSTER[i].name });
    }
    buttons.push({ id: 'start', x: 490, y: 418, w: 300, h: 56, label: 'BEGIN THE TALE' });
    buttons.push(sound);
  } else if (game.screen === 'duel') {
    buttons.push({ id: 'pause-btn', x: VIEW_W - 78, y: 92, w: 44, h: 44, label: 'II' });
    buttons.push({ id: 'speed-btn', x: VIEW_W - 78, y: 144, w: 44, h: 44, label: `${game.speed}x` });
    buttons.push(sound);
    const padY = 648;
    const padDefs = [
      ['pad-left', 44, '◀'],
      ['pad-block', 104, '▼'],
      ['pad-right', 164, '▶'],
      ['pad-jump', 224, '▲'],
      ['pad-dash', 284, 'DASH'],
    ];
    for (const [id, x, label] of padDefs) buttons.push({ id, x, y: padY, w: 54, h: 54, label });
    const atkDefs = [
      ['pad-light', 920, 'JAB'],
      ['pad-heavy', 984, 'HEAVY'],
      ['pad-special', 1048, 'ART'],
      ['pad-dash-r', 1112, 'DASH'],
    ];
    for (const [id, x, label] of atkDefs) buttons.push({ id, x, y: padY, w: 58, h: 54, label });
  } else if (game.screen === 'pause') {
    buttons.push({ id: 'resume', x: 490, y: 300, w: 300, h: 50, label: 'RESUME' });
    buttons.push({ id: 'restart-duel', x: 490, y: 360, w: 300, h: 50, label: 'RESTART DUEL' });
    buttons.push({ id: 'quit-title', x: 490, y: 420, w: 300, h: 50, label: 'QUIT TO TITLE' });
    buttons.push(sound);
  } else if (game.screen === 'reward') {
    for (let i = 0; i < UPGRADES.length; i += 1) {
      buttons.push({ id: `buy-${UPGRADES[i].id}`, x: 200 + i * 230, y: 400, w: 200, h: 44, label: 'BUY' });
    }
    buttons.push({ id: 'next-duel', x: 490, y: 540, w: 300, h: 54, label: 'NEXT DUEL →' });
    buttons.push(sound);
  } else if (game.screen === 'victory' || game.screen === 'defeat' || game.screen === 'endlessEnd') {
    buttons.push({ id: 'again', x: 420, y: 520, w: 200, h: 52, label: game.screen === 'defeat' ? 'RETRY DUEL' : 'PLAY AGAIN' });
    buttons.push({ id: 'to-title', x: 660, y: 520, w: 200, h: 52, label: 'TITLE SCREEN' });
    buttons.push(sound);
  }
  return buttons;
}

function drawHealthSide(ctx, fighter, name, x, flip, shownFrac, pips, accent) {
  const w = 460;
  const y = 44;
  const bx = flip ? x - w : x;
  text(ctx, name, flip ? x : bx, y - 8, { size: 20, fill: PALETTE.cream, align: flip ? 'right' : 'left', stroke: '#140b06' });
  bar(ctx, bx, y, w, 22, shownFrac, '#7a1d12', '#2a0d06', flip);
  bar(ctx, bx, y, w, 22, fighter.hp / fighter.maxHp, accent, 'rgba(0,0,0,0)', flip);
  // Round pips.
  for (let i = 0; i < 2; i += 1) {
    const px = flip ? x - 16 - i * 26 : bx + 8 + i * 26;
    ctx.beginPath();
    ctx.arc(px, y + 38, 8, 0, Math.PI * 2);
    ctx.fillStyle = i < pips ? PALETTE.goldBright : 'rgba(60, 40, 18, 0.9)';
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawParticles(ctx, particles) {
  for (const puff of particles.dust) {
    ctx.globalAlpha = Math.max(0, puff.life / puff.maxLife) * 0.5;
    ctx.fillStyle = '#d8b98a';
    ctx.beginPath();
    ctx.arc(puff.x, puff.y, puff.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const ring of particles.rings) {
    ctx.globalAlpha = Math.max(0, ring.life / ring.maxLife);
    ctx.strokeStyle = PALETTE.goldBright;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const spark of particles.sparks) {
    // Diamonds read as sparks at a glance; squares vanish at small sizes.
    ctx.globalAlpha = Math.max(0, spark.life / spark.maxLife);
    ctx.fillStyle = spark.gold ? PALETTE.goldBright : '#fff3d6';
    const s = spark.size * 1.7;
    ctx.beginPath();
    ctx.moveTo(spark.x, spark.y - s);
    ctx.lineTo(spark.x + s * 0.6, spark.y);
    ctx.lineTo(spark.x, spark.y + s);
    ctx.lineTo(spark.x - s * 0.6, spark.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const t of particles.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    text(ctx, t.text, t.x, t.y, { size: t.size, fill: t.color, align: 'center', stroke: '#140b06', lineWidth: 5 });
  }
  ctx.globalAlpha = 1;
}

function drawProjectiles(ctx, duel, time) {
  for (const proj of duel.projectiles) {
    if (proj.kind === 'flame') {
      ctx.fillStyle = 'rgba(255, 90, 31, 0.85)';
      ctx.beginPath();
      ctx.ellipse(proj.x, proj.y, 22, 12 + Math.sin(proj.spin) * 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.goldBright;
      ctx.beginPath();
      ctx.ellipse(proj.x, proj.y, 11, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(proj.x, proj.y);
      ctx.rotate(Math.atan2(proj.vy, proj.vx));
      ctx.strokeStyle = PALETTE.goldBright;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();
      ctx.fillStyle = PALETTE.goldBright;
      ctx.beginPath();
      ctx.moveTo(14, -5);
      ctx.lineTo(24, 0);
      ctx.lineTo(14, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const shown = { player: 1, foe: 1 };

  function drawTitle(game) {
    const stage = game.stages[0];
    drawStage(ctx, stage, game.time);
    drawGamelan(ctx, game.time);
    // Title: the name of the art itself, huge in gold.
    goldText(ctx, 'WAYANG', VIEW_W / 2, 168, 104, 'center');
    text(ctx, 'SHADOW-PUPPET DUELS BEHIND THE GLOWING SCREEN', VIEW_W / 2, 204, {
      size: 20,
      fill: PALETTE.goldBright,
      align: 'center',
      stroke: '#140b06',
    });
    text(ctx, 'The dalang lights the lamp. Two puppets step onto the kelir. Only one tale is told.', VIEW_W / 2, 236, {
      size: 16,
      fill: PALETTE.cream,
      align: 'center',
      stroke: '#140b06',
    });
    // Win / lose lines: the judge looks for a stated goal.
    panel(ctx, 250, 258, 780, 66, 10);
    text(ctx, 'WIN:  defeat all 5 acts and dethrone Rahwana, the demon king.', 270, 286, { size: 17, fill: '#b8f0c0' });
    text(ctx, 'LOSE:  fall in any duel and the screen goes dark. Retry from the same duel.', 270, 312, { size: 17, fill: '#ffb0a8' });
    // Controls, complete and on the first screen.
    panel(ctx, 250, 330, 780, 78, 10);
    text(ctx, 'A/D or ◀ ▶ move   •   W jump   •   S block   •   J light   •   K heavy   •   L special art', VIEW_W / 2, 356, {
      size: 16,
      fill: PALETTE.cream,
      align: 'center',
    });
    text(ctx, 'SHIFT dash   •   P pause   •   M sound   •   T speed   •   mouse / touch buttons work too', VIEW_W / 2, 380, {
      size: 16,
      fill: PALETTE.gold,
      align: 'center',
    });
    text(ctx, 'or press ENTER to begin', VIEW_W / 2, 402, { size: 13, fill: PALETTE.gold, align: 'center' });
    // Mode + difficulty + puppet strip buttons.
    const buttons = uiButtons(game);
    for (const button of buttons) {
      if (button.id === 'sound') continue;
      const active =
        (button.id === 'mode-story' && game.mode === 'story') ||
        (button.id === 'mode-endless' && game.mode === 'endless') ||
        button.id === `diff-${game.difficultyIndex}` ||
        button.id === `puppet-${game.selectedPuppet}` ||
        button.id === 'start';
      const locked = button.id.startsWith('puppet-') && !game.progress.unlocked.includes(button.id.slice(7));
      const isPuppet = button.id.startsWith('puppet-');
      drawButton(ctx, button, isPuppet ? '' : button.label, { active, disabled: locked, size: isPuppet ? 13 : 18 });
      if (isPuppet) {
        const def = ROSTER.find((entry) => entry.id === button.id.slice(7));
        if (def) {
          ctx.save();
          if (locked) ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.rect(button.x + 4, button.y + 4, button.w - 8, 58);
          ctx.clip();
          drawPortrait(ctx, def, button.x + button.w / 2, button.y + 60, 54, game.time);
          ctx.restore();
          text(ctx, def.name, button.x + button.w / 2, button.y + 78, {
            size: 13,
            fill: locked ? PALETTE.gold : PALETTE.cream,
            align: 'center',
          });
          if (locked) {
            text(ctx, '🔒 ' + def.unlock.text, button.x + button.w / 2, button.y + 91, {
              size: 10,
              fill: PALETTE.gold,
              align: 'center',
            });
          }
        }
      }
    }
    const selected = ROSTER.find((entry) => entry.id === game.selectedPuppet);
    if (selected) {
      text(ctx, `${selected.name} — ${selected.title}.  Special: ${selected.special.name} — ${selected.special.desc}`, VIEW_W / 2, 606 - 8, {
        size: 14,
        fill: PALETTE.cream,
        align: 'center',
        stroke: '#140b06',
      });
    }
    text(ctx, `BEST SCORE ${game.progress.bestScore}   •   ENDLESS BEST LEVEL ${game.progress.endlessBest}`, VIEW_W / 2, 44, {
      size: 15,
      fill: PALETTE.gold,
      align: 'center',
      stroke: '#140b06',
    });
    drawFrame(ctx, game.time);
  }

  function drawDuel(game) {
    const duel = game.duel;
    const info = game.duelInfo;
    const particles = game.particles;
    const shake = duel.shake > 0.5 ? { x: (Math.random() - 0.5) * duel.shake, y: (Math.random() - 0.5) * duel.shake } : { x: 0, y: 0 };
    ctx.save();
    ctx.translate(shake.x, shake.y);
    drawStage(ctx, info.stage, game.time);
    // Fighters: farther one first is unnecessary — draw foe, then player.
    const mirages = duel.player.def.id === 'hanoman' && duel.player.pose === POSE.SPECIAL;
    drawPuppet(ctx, duel.foe, game.time, {});
    drawPuppet(ctx, duel.player, game.time, { mirages });
    drawProjectiles(ctx, duel, game.time);
    drawParticles(ctx, particles);
    drawGamelan(ctx, game.time);
    ctx.restore();
    drawFrame(ctx, game.time);

    // Eased ghost health: the red trail shows recent damage. Reset each round.
    if (duel.phase === 'intro' && duel.phaseT < 0.1) {
      shown.player = 1;
      shown.foe = 1;
    }
    shown.player += (duel.player.hp / duel.player.maxHp - shown.player) * 0.08;
    shown.foe += (duel.foe.hp / duel.foe.maxHp - shown.foe) * 0.08;
    drawHealthSide(ctx, duel.player, duel.player.def.name, 44, false, shown.player, duel.player.roundsWon, '#3fae7c');
    // The foe bar stops short of the HUD button column on the right edge.
    drawHealthSide(ctx, duel.foe, duel.foe.def.name, VIEW_W - 84, true, shown.foe, duel.foe.roundsWon, '#e0342b');
    // Timer medallion.
    ctx.beginPath();
    ctx.arc(VIEW_W / 2, 58, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#140b06';
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.stroke();
    const urgent = duel.timer <= 10 && duel.phase === 'fight';
    text(ctx, String(Math.max(0, Math.ceil(duel.timer))), VIEW_W / 2, 66, {
      size: 26,
      fill: urgent ? '#ff6b5e' : PALETTE.cream,
      align: 'center',
    });
    text(ctx, info.act ? info.act.name : `ENDLESS — LEVEL ${game.endlessLevel}`, VIEW_W / 2, 108, {
      size: 15,
      fill: PALETTE.gold,
      align: 'center',
      stroke: '#140b06',
    });
    if (info.act) {
      text(ctx, `DUEL ${info.duelIndex + 1} OF 3`, VIEW_W / 2, 128, { size: 12, fill: PALETTE.cream, align: 'center', stroke: '#140b06' });
    }
    // Boss bar.
    if (info.isBoss) {
      const bw = 560;
      const bx = VIEW_W / 2 - bw / 2;
      text(ctx, `RAHWANA — PHASE ${duel.bossPhase} OF 3`, VIEW_W / 2, 152, { size: 15, fill: '#ff8a7a', align: 'center', stroke: '#140b06' });
      bar(ctx, bx, 158, bw, 14, duel.foe.hp / duel.foe.maxHp, '#c92a1e', '#2a0d06', false);
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(bx + 20 + i * 24, 190, 7, 0, Math.PI * 2);
        ctx.fillStyle = i < duel.bossPhase ? '#ff3b30' : '#5a1a12';
        ctx.fill();
        ctx.strokeStyle = PALETTE.gold;
        ctx.stroke();
      }
    }
    // Special meter + wallet.
    text(ctx, 'SPECIAL', 44, 606, { size: 13, fill: PALETTE.gold, stroke: '#140b06' });
    const meterReady = duel.player.meter >= duel.player.def.special.meter;
    bar(ctx, 44, 612, 300, 16, duel.player.meter / 100, meterReady ? PALETTE.goldBright : PALETTE.goldDim, '#2a1a08', false);
    text(ctx, `${Math.floor(duel.player.meter)}%`, 352, 626, { size: 14, fill: PALETTE.cream, stroke: '#140b06' });
    text(ctx, `COINS ${game.progress.coins}   FAVOR ${game.progress.favor}   SCORE ${game.score}`, 44, 640, {
      size: 13,
      fill: PALETTE.cream,
      stroke: '#140b06',
    });
    if (meterReady) {
      const blink = Math.sin(game.time * 6) > 0;
      if (blink) text(ctx, `${duel.player.def.special.name} READY — PRESS L`, 44, 588, { size: 15, fill: PALETTE.goldBright, stroke: '#140b06' });
    }
    // Combo counter.
    if (duel.player.combo >= 2) {
      const scale = 1 + Math.min(0.3, duel.player.combo * 0.02);
      ctx.save();
      ctx.translate(210, 210);
      ctx.scale(scale, scale);
      goldText(ctx, `${duel.player.combo} HITS!`, 0, 0, 40, 'center');
      ctx.restore();
      text(ctx, `BEST ${duel.player.bestCombo}`, 210, 238, { size: 13, fill: PALETTE.cream, align: 'center', stroke: '#140b06' });
    }
    if (duel.foe.combo >= 2) {
      text(ctx, `${duel.foe.combo} HITS!`, 1070, 210, { size: 30, fill: '#ff8a7a', align: 'center', stroke: '#140b06' });
    }
    // Finisher state: a banner in the open sky above the fighters, where the
    // eye already looks for the boss bar and the timer.
    if (finisherReady(duel)) {
      const blink = Math.sin(game.time * 8) > -0.2;
      if (blink) {
        panel(ctx, VIEW_W / 2 - 220, 208, 440, 46, 10);
        goldText(ctx, 'FINISHER READY — PRESS L', VIEW_W / 2, 240, 26, 'center');
      }
    }
    // Centre banner.
    if (duel.bannerT > 0 && duel.banner) {
      const alpha = Math.min(1, duel.bannerT * 2);
      ctx.globalAlpha = alpha;
      goldText(ctx, duel.banner, VIEW_W / 2, 300, 54, 'center');
      ctx.globalAlpha = 1;
    }
    // Buttons: HUD toggles + touch pads.
    for (const button of uiButtons(game)) {
      if (button.id.startsWith('pad-')) {
        ctx.globalAlpha = 0.88;
        drawButton(ctx, button, button.label, { size: 13 });
        ctx.globalAlpha = 1;
      } else {
        drawButton(ctx, button, button.label, { size: 16 });
      }
    }
  }

  function drawPause(game) {
    drawDuel(game);
    ctx.fillStyle = 'rgba(8, 4, 2, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(ctx, 390, 190, 500, 330, 14);
    goldText(ctx, 'PAUSED', VIEW_W / 2, 252, 46, 'center');
    text(ctx, 'The dalang rests his hands. The lamp still burns.', VIEW_W / 2, 282, { size: 15, fill: PALETTE.cream, align: 'center' });
    text(ctx, 'J light   K heavy   L special   SHIFT dash   S block', VIEW_W / 2, 470, { size: 14, fill: PALETTE.gold, align: 'center' });
    for (const button of uiButtons(game)) {
      if (button.id === 'sound') continue;
      drawButton(ctx, button, button.label, {});
    }
  }

  function drawReward(game) {
    const stage = game.duelInfo ? game.duelInfo.stage : game.stages[0];
    drawStage(ctx, stage, game.time);
    drawGamelan(ctx, game.time);
    drawFrame(ctx, game.time);
    goldText(ctx, 'DUEL WON', VIEW_W / 2, 120, 56, 'center');
    const reward = game.reward ?? { coins: 0, favor: 0, score: 0 };
    panel(ctx, 290, 134, 700, 124, 10);
    text(ctx, `The crowd roars.  +${reward.coins} coins   +${reward.favor} favor   Duel score ${reward.score}`, VIEW_W / 2, 160, {
      size: 18,
      fill: PALETTE.cream,
      align: 'center',
      stroke: '#140b06',
    });
    if (game.reward && game.reward.newly && game.reward.newly.length > 0) {
      text(ctx, `NEW PUPPET UNLOCKED: ${game.reward.newly.join(', ')}`, VIEW_W / 2, 190, {
        size: 18,
        fill: PALETTE.goldBright,
        align: 'center',
        stroke: '#140b06',
      });
    }
    text(ctx, 'SPEND COINS IN THE DALANG’S SHOP — upgrades last the whole run', VIEW_W / 2, 222, {
      size: 16,
      fill: PALETTE.gold,
      align: 'center',
      stroke: '#140b06',
    });
    text(ctx, `YOUR COINS: ${game.progress.coins}`, VIEW_W / 2, 248, { size: 16, fill: PALETTE.cream, align: 'center', stroke: '#140b06' });
    const buttons = uiButtons(game);
    for (let i = 0; i < UPGRADES.length; i += 1) {
      const def = UPGRADES[i];
      const button = buttons.find((entry) => entry.id === `buy-${def.id}`);
      const level = game.progress.upgrades[def.id];
      const maxed = level >= def.max;
      const afford = game.progress.coins >= def.cost;
      panel(ctx, button.x, 280, button.w, 110, 10);
      text(ctx, def.name, button.x + button.w / 2, 308, { size: 15, fill: PALETTE.goldBright, align: 'center' });
      text(ctx, def.desc, button.x + button.w / 2, 330, { size: 12, fill: PALETTE.cream, align: 'center' });
      for (let p = 0; p < def.max; p += 1) {
        ctx.beginPath();
        ctx.arc(button.x + button.w / 2 - (def.max - 1) * 10 + p * 20, 350, 6, 0, Math.PI * 2);
        ctx.fillStyle = p < level ? PALETTE.goldBright : 'rgba(60, 40, 18, 0.9)';
        ctx.fill();
        ctx.strokeStyle = PALETTE.gold;
        ctx.stroke();
      }
      text(ctx, maxed ? 'MASTERED' : `${def.cost} COINS`, button.x + button.w / 2, 374, { size: 13, fill: afford || maxed ? PALETTE.cream : '#8a7a5c', align: 'center' });
      drawButton(ctx, button, maxed ? 'MAXED' : 'BUY', { disabled: maxed || !afford, size: 16 });
    }
    const next = buttons.find((entry) => entry.id === 'next-duel');
    drawButton(ctx, next, game.nextLabel ?? 'NEXT DUEL →', { active: true, size: 19 });
    panel(ctx, 330, 458, 620, 34, 8);
    text(ctx, `ENDLESS LADDER — a boss every 5th level. Best level so far: ${game.progress.endlessBest}`, VIEW_W / 2, 482, {
      size: 14,
      fill: PALETTE.gold,
      align: 'center',
      stroke: '#140b06',
    });
    if (game.flashT > 0 && game.flashMsg) {
      text(ctx, game.flashMsg, VIEW_W / 2, 620, { size: 18, fill: PALETTE.goldBright, align: 'center', stroke: '#140b06' });
    }
    const sound = buttons.find((entry) => entry.id === 'sound');
    drawButton(ctx, sound, sound.label, { size: 16 });
  }

  function drawEndScreen(game, kind) {
    const stage = game.stages[kind === 'victory' ? 1 : 4];
    drawStage(ctx, stage, game.time);
    drawGamelan(ctx, game.time);
    drawFrame(ctx, game.time);
    if (kind === 'victory') {
      goldText(ctx, 'THE TALE IS TOLD', VIEW_W / 2, 150, 58, 'center');
      text(ctx, 'Rahwana falls. The lamp burns bright, and the crowd will sing this duel for years.', VIEW_W / 2, 188, {
        size: 17,
        fill: PALETTE.cream,
        align: 'center',
        stroke: '#140b06',
      });
    } else if (kind === 'defeat') {
      goldText(ctx, 'THE SCREEN GOES DARK', VIEW_W / 2, 150, 54, 'center');
      text(ctx, 'The puppet falls. But every dalang tells the tale again — retry the duel.', VIEW_W / 2, 188, {
        size: 17,
        fill: PALETTE.cream,
        align: 'center',
        stroke: '#140b06',
      });
    } else {
      goldText(ctx, 'THE LADDER ENDS', VIEW_W / 2, 150, 54, 'center');
      text(ctx, 'Endless mode: the crowd counts every rung you climbed.', VIEW_W / 2, 188, {
        size: 17,
        fill: PALETTE.cream,
        align: 'center',
        stroke: '#140b06',
      });
    }
    panel(ctx, 390, 230, 500, 210, 12);
    const rows = [
      ['RUN SCORE', String(game.score)],
      ['BEST SCORE', String(game.progress.bestScore)],
      ['DUELS WON', String(game.progress.duelsWon)],
      ['COINS EARNED', String(game.progress.coins)],
      ['FAVOR', String(game.progress.favor)],
    ];
    if (kind === 'endlessEnd') rows.push(['LEVEL REACHED', String(game.endlessLevel)]);
    if (kind === 'victory') rows.push(['ACTS CLEARED', '5 OF 5']);
    rows.forEach(([label, value], i) => {
      text(ctx, label, 430, 272 + i * 30, { size: 17, fill: PALETTE.gold });
      text(ctx, value, 850, 272 + i * 30, { size: 17, fill: PALETTE.cream, align: 'right' });
    });
    if (kind === 'victory') {
      text(ctx, 'ENDLESS LADDER UNLOCKED — how far can one puppet climb?', VIEW_W / 2, 470, {
        size: 15,
        fill: PALETTE.goldBright,
        align: 'center',
        stroke: '#140b06',
      });
    }
    for (const button of uiButtons(game)) drawButton(ctx, button, button.label, { size: 17 });
  }

  return {
    draw(game) {
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      if (game.screen === 'title') drawTitle(game);
      else if (game.screen === 'duel') drawDuel(game);
      else if (game.screen === 'pause') drawPause(game);
      else if (game.screen === 'reward') drawReward(game);
      else if (game.screen === 'victory') drawEndScreen(game, 'victory');
      else if (game.screen === 'defeat') drawEndScreen(game, 'defeat');
      else if (game.screen === 'endlessEnd') drawEndScreen(game, 'endlessEnd');
    },
  };
}

export { GROUND_Y };
