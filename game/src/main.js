// WAYANG — boot, the fixed-step loop, and the screen state machine.
// Title → duel ⇄ pause → reward shop → next duel → victory / defeat, plus the
// Endless ladder. ?shot=1..4 stages a screenshot scene through the real game
// and sets window.__shotReady for the capture script.
import { DIFFICULTIES, STEP, VIEW_H, VIEW_W } from './config.js';
import { createRandom } from './random.js';
import { ACTS, STAGES, duelAt, endlessFoe } from './acts.js';
import { fighterById } from './fighters.js';
import {
  EVENT_DUEL_END,
  EVENT_FINISHER,
  EVENT_HIT,
  EVENT_PHASE,
  EVENT_ROUND_END,
  EVENT_SPECIAL,
  createDuel,
  duelScore,
  nextRound,
  stepDuel,
} from './combat.js';
import { emptyInput } from './fighter.js';
import { aiInput, createAI } from './ai.js';
import { createAudio } from './audio.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_SOUND, ACTION_SPEED } from './input.js';
import { createRenderer, uiButtons } from './render.js';
import { applyFxEvents, createParticles, stepParticles } from './particles.js';
import {
  applyActClear,
  buyUpgrade,
  createProgress,
  earnRewards,
  isUnlocked,
  loadProgress,
  recordBest,
} from './progress.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : (Math.random() * 4294967296) | 0;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const game = {
  screen: 'title',
  mode: 'story',
  difficulties: DIFFICULTIES,
  difficultyIndex: 1,
  difficulty: DIFFICULTIES[1],
  stages: STAGES,
  selectedPuppet: 'arjuna',
  progress: loadProgress(),
  runProgress: null,
  duel: null,
  duelInfo: null,
  ai: null,
  endlessLevel: 1,
  endlessRng: createRandom(seed ^ 0x51ed),
  particles: createParticles(),
  audio: createAudio(),
  time: 0,
  score: 0,
  reward: null,
  nextLabel: 'NEXT DUEL →',
  speed: 1,
  flashT: 0,
  flashMsg: '',
  shotStaged: false,
  duelSeed: seed,
};

const renderer = createRenderer(canvas);
const input = createInput(canvas);

function announce(message) {
  status.textContent = message;
}

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function startDuelFor(info, foeHealthScale, foeDamageScale) {
  const playerDef = fighterById(game.selectedPuppet);
  game.duelInfo = info;
  game.duelSeed = (game.duelSeed * 1103515245 + 12345) >>> 0;
  game.duel = createDuel(playerDef, info.foe, {
    upgrades: game.runProgress.upgrades,
    foeHealthScale: foeHealthScale ?? info.healthScale ?? 1,
    foeDamageScale: foeDamageScale ?? game.difficulty.damageScale,
    seed: game.duelSeed,
  });
  game.ai = createAI(game.difficulty, info.aiBoost ?? 0, { isBoss: info.isBoss });
  game.particles = createParticles();
  game.screen = 'duel';
  game.audio.setMode(info.isBoss ? 'boss' : 'duel');
  game.audio.gong();
  announce(`${info.act ? info.act.name : 'Endless level ' + game.endlessLevel}. ${playerDef.name} versus ${info.foe.name}. Fight!`);
}

function startRun() {
  game.runProgress = {
    coins: 0,
    favor: 0,
    upgrades: { damage: 0, health: 0, meter: 0, art: 0 },
    unlocked: [...game.progress.unlocked],
    duelsWon: 0,
    bestScore: game.progress.bestScore,
    endlessBest: game.progress.endlessBest,
    actsCleared: game.progress.actsCleared,
  };
  game.progress = game.runProgress;
  game.score = 0;
  game.endlessLevel = 1;
  if (game.mode === 'story') {
    startDuelFor(duelAt(0, 0));
  } else {
    const foe = endlessFoe(1, game.endlessRng);
    startDuelFor({ act: null, actIndex: 0, duelIndex: 0, foe: foe.foe, isBoss: foe.isBoss, stage: foe.stage, aiBoost: foe.aiBoost, healthScale: foe.healthScale }, foe.healthScale, foe.damageScale);
  }
}

function advanceAfterWin() {
  // Story mode only: Endless wins go to the reward screen from handleDuelEnd.
  const info = game.duelInfo;
  const lastDuelOfAct = info.duelIndex >= 2;
  const lastAct = info.actIndex >= ACTS.length - 1;
  if (lastDuelOfAct && lastAct) {
    game.screen = 'victory';
    game.audio.setMode('victory');
    recordBest(game.progress, game.score, null);
    announce(`Victory! Final score ${game.score}.`);
    return;
  }
  if (lastDuelOfAct) {
    const newly = applyActClear(game.progress, info.actIndex);
    if (newly.length > 0) {
      game.reward = { ...(game.reward ?? { coins: 0, favor: 0, score: 0 }), newly: newly.map((id) => fighterById(id).name) };
    }
  }
  game.nextLabel = lastDuelOfAct ? 'NEXT ACT →' : 'NEXT DUEL →';
  game.screen = 'reward';
  game.audio.setMode('title');
}

function goToNextDuel() {
  const info = game.duelInfo;
  const lastDuelOfAct = info.duelIndex >= 2;
  if (lastDuelOfAct) startDuelFor(duelAt(info.actIndex + 1, 0));
  else startDuelFor(duelAt(info.actIndex, info.duelIndex + 1));
}

function handleDuelEnd() {
  const won = game.duel.winner === game.duel.player;
  const gained = duelScore(game.duel);
  game.score += gained;
  if (won) {
    const reward = earnRewards(game.progress, game.duelInfo.actIndex, game.duelInfo.duelIndex, gained, true);
    game.reward = { ...reward, newly: [] };
    game.audio.crowd();
    if (game.mode === 'endless') {
      recordBest(game.progress, game.score, game.endlessLevel);
      game.reward = { ...reward, newly: [] };
      game.nextLabel = 'NEXT LEVEL →';
      game.screen = 'reward';
      return;
    }
    advanceAfterWin();
  } else {
    earnRewards(game.progress, game.duelInfo.actIndex, game.duelInfo.duelIndex, gained, false);
    recordBest(game.progress, game.score, game.mode === 'endless' ? game.endlessLevel : null);
    game.screen = game.mode === 'endless' ? 'endlessEnd' : 'defeat';
    game.audio.setMode('title');
    announce(`Defeat. Score ${game.score}.`);
  }
}

function handleButton(id) {
  game.audio.ensure();
  if (id === 'sound') {
    game.audio.toggle();
    announce(game.audio.on ? 'Sound on.' : 'Sound off.');
    return;
  }
  if (game.screen === 'title') {
    if (id === 'mode-story' || id === 'mode-endless') {
      game.mode = id === 'mode-story' ? 'story' : 'endless';
      game.audio.select();
    } else if (id.startsWith('diff-')) {
      game.difficultyIndex = Number(id.slice(5));
      game.difficulty = DIFFICULTIES[game.difficultyIndex];
      game.audio.select();
    } else if (id.startsWith('puppet-')) {
      const puppetId = id.slice(7);
      if (isUnlocked(game.progress, puppetId)) {
        game.selectedPuppet = puppetId;
        game.audio.select();
        announce(`${fighterById(puppetId).name} selected.`);
      }
    } else if (id === 'start') {
      game.audio.select();
      startRun();
    }
    return;
  }
  if (game.screen === 'duel') {
    if (id === 'pause-btn') {
      game.screen = 'pause';
      announce('Paused.');
    } else if (id === 'speed-btn') {
      game.speed = game.speed === 1 ? 2 : 1;
      announce(`Speed ${game.speed}x.`);
    } else if (id.startsWith('pad-')) {
      input.setPad(id, true);
    }
    return;
  }
  if (game.screen === 'pause') {
    if (id === 'resume') game.screen = 'duel';
    else if (id === 'restart-duel') startDuelFor(game.duelInfo);
    else if (id === 'quit-title') {
      game.screen = 'title';
      game.audio.setMode('title');
    }
    return;
  }
  if (game.screen === 'reward') {
    if (id.startsWith('buy-')) {
      const ok = buyUpgrade(game.progress, id.slice(4));
      game.flashMsg = ok ? 'UPGRADE BOUGHT!' : 'NOT ENOUGH COINS';
      game.flashT = 1.2;
      if (ok) game.audio.coin();
    } else if (id === 'next-duel') {
      if (game.mode === 'endless') {
        game.endlessLevel += 1;
        const foe = endlessFoe(game.endlessLevel, game.endlessRng);
        startDuelFor({ act: null, actIndex: 0, duelIndex: 0, foe: foe.foe, isBoss: foe.isBoss, stage: foe.stage, aiBoost: foe.aiBoost, healthScale: foe.healthScale }, foe.healthScale, foe.damageScale);
      } else {
        goToNextDuel();
      }
    }
    return;
  }
  if (game.screen === 'victory' || game.screen === 'defeat' || game.screen === 'endlessEnd') {
    if (id === 'again') {
      if (game.screen === 'defeat') startDuelFor(game.duelInfo);
      else startRun();
    } else if (id === 'to-title') {
      game.screen = 'title';
      game.audio.setMode('title');
    }
  }
}

function handleClicks() {
  const buttons = uiButtons(game);
  for (const click of input.takeClicks()) {
    for (const button of buttons) {
      if (click.x >= button.x && click.x <= button.x + button.w && click.y >= button.y && click.y <= button.y + button.h) {
        handleButton(button.id);
        break;
      }
    }
  }
}

function handleActions(snapshot) {
  if (snapshot.actions & ACTION_SOUND) {
    game.audio.toggle();
    announce(game.audio.on ? 'Sound on.' : 'Sound off.');
  }
  if (snapshot.actions & ACTION_SPEED && game.screen === 'duel') {
    game.speed = game.speed === 1 ? 2 : 1;
  }
  if (snapshot.actions & ACTION_CONFIRM) {
    if (game.screen === 'title') startRun();
    else if (game.screen === 'pause') game.screen = 'duel';
    else if (game.screen === 'reward') handleButton('next-duel');
    else if (game.screen === 'victory' || game.screen === 'endlessEnd') startRun();
    else if (game.screen === 'defeat') startDuelFor(game.duelInfo);
  }
  if (snapshot.actions & ACTION_PAUSE) {
    if (game.screen === 'duel') {
      game.screen = 'pause';
      announce('Paused.');
    } else if (game.screen === 'pause') {
      game.screen = 'duel';
    }
  }
}

function stepGame(snapshot, dt) {
  game.time += dt;
  game.flashT = Math.max(0, game.flashT - dt);
  if (game.screen === 'duel' && game.duel) {
    const rng = createRandom((game.duelSeed + Math.floor(game.time * 60)) >>> 0);
    const foeInput = aiInput(game.ai, game.duel.foe, game.duel.player, game.duel, dt, rng);
    const fx = [];
    const steps = game.speed;
    let events = 0;
    for (let i = 0; i < steps; i += 1) {
      events |= stepDuel(game.duel, snapshot, foeInput, STEP, fx);
      if (game.duel.phase === 'done') break;
    }
    applyFxEvents(game.particles, fx);
    stepParticles(game.particles, dt);
    if (events & EVENT_HIT) game.audio.hit('light');
    if (events & EVENT_SPECIAL) game.audio.special();
    if (events & EVENT_FINISHER) game.audio.finisher();
    if (events & EVENT_PHASE) game.audio.gong();
    if (events & EVENT_ROUND_END && !(events & EVENT_DUEL_END)) {
      game.audio.gong();
      setTimeout(() => {
        if (game.duel && game.duel.phase === 'roundEnd') nextRound(game.duel);
      }, 1400);
    }
    if (events & EVENT_DUEL_END) {
      setTimeout(() => {
        if (game.duel && game.duel.phase === 'done') handleDuelEnd();
      }, 1400);
    }
  } else {
    stepParticles(game.particles, dt);
  }
}

function runShot(name) {
  stageShot(name, game);
  let painted = 0;
  function paint() {
    renderer.draw(game);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();
  game.audio.setMode('title');
  announce('Wayang. Choose a puppet and a mode, then begin the tale.');

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.screen === 'duel') {
      game.screen = 'pause';
      announce('Paused.');
    }
  });
  document.addEventListener('pointerdown', () => game.audio.ensure(), { once: false });
  document.addEventListener('keydown', () => game.audio.ensure(), { once: false });

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const snapshot = input.poll();
    handleActions(snapshot);
    handleClicks();
    game.audio.step();
    if (game.screen === 'duel' || game.screen === 'title' || game.screen === 'reward') {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        stepGame(snapshot, STEP);
        accumulator -= STEP;
        if (game.screen === 'pause') {
          accumulator = 0;
          break;
        }
      }
    } else {
      accumulator = 0;
      stepGame(emptyInput(), elapsed);
    }
    renderer.draw(game);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

export { game };
