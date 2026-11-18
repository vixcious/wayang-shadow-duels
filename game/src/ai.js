// The foe's brain: a readable state machine that approaches, spaces, blocks,
// punishes and spends meter. Difficulty sets reaction time, aggression and
// mistake rate; acts scale its courage; Rahwana's phases unlock new tricks.
import { emptyInput, fighterCanAct, fighterIsAttacking } from './fighter.js';

export function createAI(difficulty, actIndex, opts) {
  const options = opts ?? {};
  return {
    difficulty,
    actIndex,
    isBoss: Boolean(options.isBoss),
    decideT: 0,
    plan: null,
    planT: 0,
    strafeDir: 1,
    strafeT: 0,
    aggression: difficulty.aggression + actIndex * 0.05,
    courage: 0.5 + actIndex * 0.1,
  };
}

function preferredRange(self) {
  return self.def.light.range * self.def.reach + 30;
}

export function aiInput(ai, self, foe, duel, dt, rng) {
  const input = emptyInput();
  if (duel.phase !== 'fight') return input;
  if (!fighterCanAct(self) && !fighterIsAttacking(self)) return input;

  ai.decideT -= dt;
  ai.strafeT -= dt;
  if (ai.strafeT <= 0) {
    ai.strafeT = rng.range(0.5, 1.4);
    ai.strafeDir = rng.chance(0.5) ? 1 : -1;
  }

  const dist = Math.abs(foe.x - self.x);
  const toward = foe.x > self.x ? 1 : -1;
  const foeAttacking = fighterIsAttacking(foe);
  const range = preferredRange(self);
  const diff = ai.difficulty;
  const phaseBoost = duel.foeIsBoss ? (duel.bossPhase - 1) * 0.15 : 0;
  const aggression = Math.min(0.95, ai.aggression + phaseBoost);

  // Re-decide on the reaction clock.
  if (ai.decideT <= 0) {
    ai.decideT = diff.reaction * rng.range(0.7, 1.3);
    ai.plan = null;
    const roll = rng.next();

    // Defense first: block an incoming strike, sometimes jump a projectile.
    if (foeAttacking && dist < range * 1.6 && rng.chance(diff.blockChance + phaseBoost)) {
      ai.plan = 'block';
      ai.planT = rng.range(0.25, 0.5);
    } else if (duel.projectiles.some((p) => p.owner === foe && Math.abs(p.x - self.x) < 260) && rng.chance(0.6)) {
      ai.plan = 'jump';
      ai.planT = 0.2;
    } else if (self.meter >= self.def.special.meter && rng.chance(0.25 + aggression * 0.4)) {
      // Spend meter when the foe is in reach or the boss wants pressure.
      if (dist < 420 || duel.foeIsBoss) {
        ai.plan = 'special';
        ai.planT = 0.15;
      }
    } else if (dist <= range && roll < aggression) {
      ai.plan = rng.chance(0.62) ? 'light' : 'heavy';
      ai.planT = 0.12;
    } else if (dist <= range * 1.4 && roll < aggression + 0.2) {
      ai.plan = 'approach-attack';
      ai.planT = 0.4;
    } else if (dist > range && roll < 0.12) {
      ai.plan = 'dash';
      ai.planT = 0.15;
    } else if (rng.chance(0.08)) {
      ai.plan = 'retreat';
      ai.planT = rng.range(0.3, 0.6);
    }
  }

  ai.planT -= dt;
  const plan = ai.planT > 0 ? ai.plan : null;

  // Boss phase tricks: phase 2 fires demon flame from range, phase 3 dashes in.
  if (duel.foeIsBoss && duel.bossPhase >= 2 && dist > 300 && self.meter >= self.def.special.meter && rng.chance(0.02)) {
    input.special = true;
    return input;
  }
  if (duel.foeIsBoss && duel.bossPhase >= 3 && dist > 220 && rng.chance(0.03)) {
    input.dash = true;
    return input;
  }

  if (plan === 'block') {
    input.block = true;
    return input;
  }
  if (plan === 'jump') {
    input.jump = true;
    return input;
  }
  if (plan === 'special') {
    input.special = true;
    return input;
  }
  if (plan === 'light') {
    input.light = true;
    return input;
  }
  if (plan === 'heavy') {
    input.heavy = true;
    return input;
  }
  if (plan === 'dash') {
    input.dash = true;
    if (toward < 0) input.left = true;
    else input.right = true;
    return input;
  }
  if (plan === 'retreat') {
    if (toward > 0) input.left = true;
    else input.right = true;
    return input;
  }

  // Default: close distance, with a little strafe so it does not look robotic.
  if (dist > range) {
    if (toward > 0) input.right = true;
    else input.left = true;
    if (plan === 'approach-attack' && dist < range * 1.3) input.light = true;
  } else if (dist < range * 0.55 && rng.chance(0.3)) {
    // Too close: step back or jump over.
    if (rng.chance(0.5)) {
      if (toward > 0) input.left = true;
      else input.right = true;
    } else {
      input.jump = true;
    }
  } else if (ai.strafeDir !== 0 && rng.chance(0.25)) {
    if (ai.strafeDir > 0) input.right = true;
    else input.left = true;
  }
  return input;
}

// A fair autopilot for the PLAYER side, used by the screenshot stager and the
// headless trial: it plays to win with a fixed seed, never reading the future.
export function autopilotInput(self, foe, duel, dt, rng, memory) {
  const input = emptyInput();
  if (duel.phase !== 'fight') return input;
  memory.t -= dt;
  const dist = Math.abs(foe.x - self.x);
  const toward = foe.x > self.x ? 1 : -1;
  const range = self.def.light.range * self.def.reach + 20;
  if (memory.t <= 0) {
    memory.t = rng.range(0.15, 0.4);
    memory.move = null;
    if (duel.projectiles.some((p) => p.owner === foe && Math.abs(p.x - self.x) < 240)) memory.move = 'jump';
    else if (self.meter >= self.def.special.meter && dist < 380 && rng.chance(0.5)) memory.move = 'special';
    else if (dist <= range) memory.move = rng.chance(0.7) ? 'light' : 'heavy';
    else if (fighterIsAttacking(foe) && dist < range * 1.8 && rng.chance(0.5)) memory.move = 'block';
    else if (dist > range * 2.2 && rng.chance(0.25)) memory.move = 'dash';
    else memory.move = 'approach';
  }
  if (memory.move === 'jump') input.jump = true;
  else if (memory.move === 'special') input.special = true;
  else if (memory.move === 'light') input.light = true;
  else if (memory.move === 'heavy') input.heavy = true;
  else if (memory.move === 'block') input.block = true;
  else if (memory.move === 'dash') {
    input.dash = true;
    if (toward < 0) input.left = true;
    else input.right = true;
  } else if (dist > range) {
    if (toward > 0) input.right = true;
    else input.left = true;
  }
  return input;
}
