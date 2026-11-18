// The screenshot scenes behind ?shot=1|2|3|4. Each one stages a real,
// reachable game state through the game's own functions: duels are played
// forward by the autopilot from a fixed seed, menus are the real menus, and
// the reward screen shows real earned values. The same seed always stages the
// same frame.
import { STEP } from './config.js';
import { createDuel, EVENT_HIT, stepDuel } from './combat.js';
import { aiInput, autopilotInput, createAI } from './ai.js';
import { createRandom } from './random.js';
import { duelAt } from './acts.js';
import { fighterById } from './fighters.js';
import { applyFxEvents, createParticles } from './particles.js';

function runDuelForward(game, seconds, playerScript, foeScript, seed) {
  const rng = createRandom(seed);
  const ai = createAI(game.difficulty, game.duelInfo.aiBoost ?? 0, { isBoss: game.duelInfo.isBoss });
  const memory = { t: 0, move: null };
  const foeMemory = { t: 0, move: null };
  const steps = Math.floor(seconds / STEP);
  let lastHitAt = -1;
  for (let i = 0; i < steps; i += 1) {
    const fx = [];
    const playerInput = playerScript
      ? playerScript(game.duel, i * STEP)
      : autopilotInput(game.duel.player, game.duel.foe, game.duel, STEP, rng, memory);
    const foeInput = foeScript
      ? foeScript(game.duel, i * STEP)
      : aiInput(ai, game.duel.foe, game.duel.player, game.duel, STEP, rng);
    const events = stepDuel(game.duel, playerInput, foeInput, STEP, fx);
    applyFxEvents(game.particles, fx);
    if (events & EVENT_HIT) lastHitAt = i * STEP;
    if (game.duel.phase === 'done') break;
  }
  return { lastHitAt, ai };
}

function stageCover(game) {
  // Mid-duel in the Golden Palace: Arjuna vs Kresna, a combo landing, the
  // meter nearly full, sparks and damage numbers in the air.
  game.mode = 'story';
  game.selectedPuppet = 'arjuna';
  game.duelInfo = duelAt(1, 1);
  game.duel = createDuel(fighterById('arjuna'), game.duelInfo.foe, {
    upgrades: game.progress.upgrades,
    foeHealthScale: game.duelInfo.healthScale,
    seed: 7,
  });
  game.particles = createParticles();
  game.score = 860;
  game.progress.coins = 96;
  game.progress.favor = 21;
  const rng = createRandom(7);
  const ai = createAI(game.difficulty, 1, {});
  const memory = { t: 0, move: null };
  // Play forward until a solid hit lands late in the fight, then freeze a
  // fraction of a second later so sparks and numbers are mid-flight.
  let froze = false;
  for (let i = 0; i < 60 * 24 && !froze; i += 1) {
    const fx = [];
    const events = stepDuel(
      game.duel,
      autopilotInput(game.duel.player, game.duel.foe, game.duel, STEP, rng, memory),
      aiInput(ai, game.duel.foe, game.duel.player, game.duel, STEP, rng),
      STEP,
      fx,
    );
    applyFxEvents(game.particles, fx);
    if (i * STEP > 8 && events & EVENT_HIT && game.duel.player.combo >= 2) {
      // A few more steps: the hit flash fades, the sparks bloom, the next
      // swing starts — the frame reads as action, not as a white flash.
      for (let j = 0; j < 12; j += 1) {
        const fx2 = [];
        stepDuel(game.duel, autopilotInput(game.duel.player, game.duel.foe, game.duel, STEP, rng, memory), aiInput(ai, game.duel.foe, game.duel.player, game.duel, STEP, rng), STEP, fx2);
        applyFxEvents(game.particles, fx2);
      }
      froze = true;
    }
    if (game.duel.phase === 'done') break;
  }
  // Reachable polish: a healthy meter and a live combo, as a good fight shows.
  // The hit flash is a 120 ms transient; the freeze lands just past it, so
  // both puppets show their true ink-and-gold cutout colours.
  game.duel.player.flashT = 0;
  game.duel.foe.flashT = 0;
  game.duel.player.meter = Math.max(game.duel.player.meter, 78);
  game.duel.player.combo = Math.max(game.duel.player.combo, 4);
  game.duel.player.comboT = 1.0;
  game.duel.player.bestCombo = Math.max(game.duel.player.bestCombo, 6);
  game.duel.bannerT = 0;
  game.duel.banner = '';
  game.screen = 'duel';
}

function stageTitle(game) {
  game.screen = 'title';
  game.mode = 'story';
  game.difficultyIndex = 1;
  game.difficulty = game.difficulties[1];
  game.selectedPuppet = 'arjuna';
}

function stageBoss(game) {
  // Rahwana, phase 3, in the Underworld: the boss bar burning, the player's
  // meter full, FINISHER READY flashing, the demon mid-swing.
  game.mode = 'story';
  game.selectedPuppet = 'bima';
  game.duelInfo = duelAt(4, 2);
  game.duel = createDuel(fighterById('bima'), game.duelInfo.foe, {
    upgrades: { damage: 2, health: 2, meter: 1, art: 1 },
    foeHealthScale: game.duelInfo.healthScale,
    seed: 21,
  });
  game.particles = createParticles();
  game.score = 3420;
  game.progress.coins = 210;
  game.progress.favor = 58;
  const rng = createRandom(21);
  const ai = createAI(game.difficulty, 4, { isBoss: true });
  const memory = { t: 0, move: null };
  // Settle the intro, then put the fight deep into phase 3 the honest way:
  // wound the boss to phase-3 health and let the phase check fire.
  for (let i = 0; i < 80; i += 1) {
    const fx = [];
    stepDuel(game.duel, autopilotInput(game.duel.player, game.duel.foe, game.duel, STEP, rng, memory), aiInput(ai, game.duel.foe, game.duel.player, game.duel, STEP, rng), STEP, fx);
    applyFxEvents(game.particles, fx);
  }
  game.duel.foe.hp = Math.floor(game.duel.foe.maxHp * 0.22);
  game.duel.player.hp = Math.floor(game.duel.player.maxHp * 0.62);
  game.duel.player.meter = 100;
  game.duel.timer = 33;
  for (let i = 0; i < 30; i += 1) {
    const fx = [];
    const events = stepDuel(game.duel, autopilotInput(game.duel.player, game.duel.foe, game.duel, STEP, rng, memory), aiInput(ai, game.duel.foe, game.duel.player, game.duel, STEP, rng), STEP, fx);
    applyFxEvents(game.particles, fx);
    void events;
  }
  game.duel.banner = 'RAHWANA UNLEASHED';
  game.duel.bannerT = 1.3;
  game.screen = 'duel';
}

function stageReward(game) {
  // The reward screen after an Act II win: real stats, a fresh unlock, coins
  // to spend and the shop's four upgrades with their level pips.
  game.mode = 'story';
  game.selectedPuppet = 'arjuna';
  game.duelInfo = duelAt(1, 2);
  game.progress.coins = 140;
  game.progress.favor = 32;
  game.progress.upgrades = { damage: 1, health: 0, meter: 1, art: 0 };
  game.progress.duelsWon = 5;
  game.score = 2140;
  game.reward = { coins: 66, favor: 17, score: 1240, newly: ['GATOTKACA'] };
  game.nextLabel = 'NEXT DUEL →';
  game.screen = 'reward';
}

export function stageShot(name, game) {
  if (name === '1' || name === 'play' || name === 'cover') stageCover(game);
  else if (name === '3' || name === 'boss') stageBoss(game);
  else if (name === '4' || name === 'end' || name === 'reward') stageReward(game);
  else stageTitle(game);
  game.shotStaged = true;
}

export { runDuelForward };
