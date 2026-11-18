// The duel: two fighters, rounds, the clock, hit resolution, combos, meter,
// projectiles, hit-stop and KO slow motion. Pure simulation; the renderer and
// the audio only read the events this module returns.
import { ARENA_LEFT, ARENA_RIGHT, COMBO_WINDOW, FINISHER_HP_FRACTION, METER_MAX, ROUND_TIME, ROUNDS_TO_WIN, STEP } from './config.js';
import {
  POSE,
  applyHit,
  attackHitbox,
  createFighter,
  emptyInput,
  fighterIsAttacking,
  gainMeter,
  hurtbox,
  resetForRound,
  stepFighter,
} from './fighter.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_BLOCKED = 2;
export const EVENT_KO = 4;
export const EVENT_ROUND_END = 8;
export const EVENT_DUEL_END = 16;
export const EVENT_SPECIAL = 32;
export const EVENT_FINISHER = 64;
export const EVENT_PROJECTILE = 128;
export const EVENT_PHASE = 256;
export const EVENT_TIMER_END = 512;
export const EVENT_DASH = 1024;
export const EVENT_JUMP = 2048;

export function createDuel(playerDef, foeDef, opts) {
  const options = opts ?? {};
  const duel = {
    player: createFighter(playerDef, 430, 1, options.upgrades),
    foe: createFighter(foeDef, 850, -1, null),
    foeIsBoss: Boolean(foeDef.boss),
    bossPhase: 1,
    bossPhaseAnnounced: 1,
    round: 1,
    timer: ROUND_TIME,
    phase: 'intro',
    phaseT: 0,
    projectiles: [],
    hitstop: 0,
    slowmo: 0,
    shake: 0,
    roundWinner: null,
    winner: null,
    banner: 'ROUND 1',
    bannerT: 1.1,
    foeDamageScale: options.foeDamageScale ?? 1,
    foeHealthScale: options.foeHealthScale ?? 1,
    seed: options.seed ?? 1,
    time: 0,
    finisherUsed: false,
  };
  if (options.foeHealthScale && options.foeHealthScale !== 1) {
    duel.foe.maxHp = Math.round(duel.foe.maxHp * options.foeHealthScale);
    duel.foe.hp = duel.foe.maxHp;
  }
  return duel;
}

export function duelIsOver(duel) {
  return duel.phase === 'done';
}

export function duelScore(duel) {
  const p = duel.player;
  return Math.round(p.damageDealt * 2 + p.bestCombo * 40 + p.hp * 3 + (duel.winner === p ? 500 : 0));
}

function boxesOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolveStrike(duel, attacker, defender, events, fx) {
  const box = attackHitbox(attacker);
  if (!box || attacker.attackHitDone) return events;
  if (!boxesOverlap(box, hurtbox(defender))) return events;
  attacker.attackHitDone = true;
  const attack = attacker.attack;
  const finisher =
    attack.kind === 'special' &&
    defender.hp <= defender.maxHp * FINISHER_HP_FRACTION &&
    !duel.finisherUsed;
  let damage = attack.damage * attacker.powerScale * (attacker === duel.foe ? duel.foeDamageScale : 1);
  if (finisher) {
    damage *= 1.8;
    duel.finisherUsed = true;
  }
  if (attack.kind === 'special' && attacker.artLevel > 0) damage *= 1 + 0.25 * attacker.artLevel;
  const result = applyHit(defender, Math.round(damage), attack.knock, attacker, {
    launcher: attack.kind === 'heavy' && defender.hp <= defender.maxHp * 0.3,
    unblockable: finisher,
  });
  attacker.damageDealt += result.dealt;
  attacker.combo += 1;
  attacker.comboT = COMBO_WINDOW;
  attacker.bestCombo = Math.max(attacker.bestCombo, attacker.combo);
  gainMeter(attacker, attack.kind === 'special' ? 4 : attack.kind === 'heavy' ? 9 : 6);
  gainMeter(defender, 4);
  duel.hitstop = Math.max(duel.hitstop, attack.kind === 'heavy' ? 0.09 : 0.05);
  duel.shake = Math.max(duel.shake, attack.kind === 'heavy' ? 9 : 5);
  fx.push({
    type: result.blocked ? 'block' : 'hit',
    x: defender.x - defender.facing * defender.width * 0.3,
    y: defender.y - defender.height * 0.55,
    power: attack.kind,
    damage: result.dealt,
    finisher,
  });
  if (finisher) {
    events |= EVENT_FINISHER;
    duel.slowmo = Math.max(duel.slowmo, 0.55);
    duel.shake = Math.max(duel.shake, 14);
  }
  if (result.blocked) events |= EVENT_BLOCKED;
  else events |= EVENT_HIT;
  if (result.ko) events |= EVENT_KO;
  return events;
}

function spawnSpecialProjectiles(duel, attacker, events) {
  const special = attacker.def.special;
  if (!special.projectiles) return events;
  const count = special.projectiles;
  for (let i = 0; i < count; i += 1) {
    const spread = count === 1 ? 0 : (i - (count - 1) / 2) * 0.16;
    duel.projectiles.push({
      owner: attacker,
      x: attacker.x + attacker.facing * 50,
      y: attacker.y - attacker.height * 0.6 + i * 6,
      vx: attacker.facing * 620,
      vy: spread * 620,
      damage: special.damage * attacker.powerScale,
      life: 1.4,
      kind: attacker.def.id === 'rahwana' ? 'flame' : 'arrow',
      spin: 0,
    });
  }
  return events | EVENT_PROJECTILE;
}

function stepProjectiles(duel, dt, events, fx) {
  const kept = [];
  for (const proj of duel.projectiles) {
    proj.life -= dt;
    proj.spin += dt * 10;
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    if (proj.kind === 'flame') proj.y += Math.sin(proj.spin) * 22 * dt;
    const target = proj.owner === duel.player ? duel.foe : duel.player;
    if (proj.life > 0 && boxesOverlap({ x: proj.x - 14, y: proj.y - 12, w: 28, h: 24 }, hurtbox(target))) {
      // Projectiles are special arts, so they can finish a duel too: a foe at
      // a quarter health falls to the finisher's heavier, unblockable blow.
      const finisher = target.hp <= target.maxHp * FINISHER_HP_FRACTION && !duel.finisherUsed;
      if (finisher) duel.finisherUsed = true;
      const damage = Math.round(proj.damage * (finisher ? 1.8 : 1));
      const result = applyHit(target, damage, 220, proj.owner, { unblockable: finisher });
      proj.owner.damageDealt += result.dealt;
      gainMeter(proj.owner, 6);
      fx.push({ type: 'hit', x: proj.x, y: proj.y, power: 'special', damage: result.dealt, finisher });
      duel.shake = Math.max(duel.shake, finisher ? 14 : 7);
      if (finisher) {
        events |= EVENT_FINISHER;
        duel.slowmo = Math.max(duel.slowmo, 0.55);
      }
      events |= EVENT_HIT;
      if (result.ko) events |= EVENT_KO;
      continue;
    }
    if (proj.life > 0 && proj.x > 60 && proj.x < 1220) kept.push(proj);
  }
  duel.projectiles = kept;
  return events;
}

function checkBossPhase(duel, events) {
  if (!duel.foeIsBoss) return events;
  const frac = duel.foe.hp / duel.foe.maxHp;
  const phase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
  if (phase !== duel.bossPhase) {
    duel.bossPhase = phase;
    duel.bossPhaseAnnounced = phase;
    duel.banner = phase === 2 ? 'RAHWANA GROWS SHADOWS' : 'RAHWANA UNLEASHED';
    duel.bannerT = 1.4;
    duel.shake = Math.max(duel.shake, 12);
    return events | EVENT_PHASE;
  }
  return events;
}

// Advance the duel one fixed step. `fx` collects hit effects for the renderer.
// Returns the event bitmask for this step.
export function stepDuel(duel, playerInput, foeInput, dt, fx) {
  let events = EVENT_NONE;
  duel.time += dt;
  duel.bannerT = Math.max(0, duel.bannerT - dt);
  duel.shake = Math.max(0, duel.shake - 40 * dt);

  if (duel.phase === 'intro') {
    duel.phaseT += dt;
    stepFighter(duel.player, emptyInput(), dt, duel.foe);
    stepFighter(duel.foe, emptyInput(), dt, duel.player);
    if (duel.phaseT >= 1.1) {
      duel.phase = 'fight';
      duel.phaseT = 0;
      duel.banner = 'FIGHT!';
      duel.bannerT = 0.7;
    }
    return events;
  }
  if (duel.phase === 'roundEnd' || duel.phase === 'done') {
    duel.phaseT += dt;
    stepFighter(duel.player, emptyInput(), dt, duel.foe);
    stepFighter(duel.foe, emptyInput(), dt, duel.player);
    return events;
  }

  // Hit-stop freezes both fighters briefly; slow-mo stretches the KO moment.
  if (duel.hitstop > 0) {
    duel.hitstop -= dt;
    return events;
  }
  let scale = 1;
  if (duel.slowmo > 0) {
    duel.slowmo -= dt;
    scale = 0.3;
  }
  const sdt = dt * scale;

  duel.timer -= dt;
  const playerWasAirborne = duel.player.airborne;
  const playerWasDashing = duel.player.pose === POSE.DASH;
  stepFighter(duel.player, playerInput, sdt, duel.foe);
  stepFighter(duel.foe, foeInput, sdt, duel.player);
  if (!playerWasAirborne && duel.player.airborne) events |= EVENT_JUMP;
  if (!playerWasDashing && duel.player.pose === POSE.DASH) events |= EVENT_DASH;

  // Special side effects fire once, at the strike moment.
  for (const fighter of [duel.player, duel.foe]) {
    if (fighter.pose === POSE.SPECIAL && fighter.attack && !fighter.specialFired && fighter.poseT >= fighter.attack.startup) {
      fighter.specialFired = true;
      if (fighter.def.special.projectiles) events = spawnSpecialProjectiles(duel, fighter, events);
      if (fighter.def.special.shockwave) {
        duel.shake = Math.max(duel.shake, 12);
        fx.push({ type: 'shockwave', x: fighter.x, y: fighter.y - 10, power: 'special', damage: 0, finisher: false });
      }
      if (fighter.def.special.lifesteal) {
        const foe = fighter === duel.player ? duel.foe : duel.player;
        const stolen = Math.round(fighter.def.special.damage * fighter.def.special.lifesteal);
        foe.hp = Math.max(1, foe.hp - stolen);
        fighter.hp = Math.min(fighter.maxHp, fighter.hp + stolen);
      }
      events |= EVENT_SPECIAL;
    }
    // Multi-hit specials keep striking while the pose lasts.
    if (fighter.specialHitsLeft > 0 && fighter.pose === POSE.SPECIAL) {
      fighter.specialHitTimer -= sdt;
      if (fighter.specialHitTimer <= 0) {
        fighter.specialHitTimer = 0.09;
        fighter.specialHitsLeft -= 1;
        fighter.attackHitDone = false;
        const foe = fighter === duel.player ? duel.foe : duel.player;
        if (Math.abs(foe.x - fighter.x) < 190) {
          events = resolveStrike(duel, fighter, foe, events, fx);
        }
      }
    }
    // Dash-through arts carry the puppet through the foe while striking.
    if (fighter.def.special.dashThrough && fighter.pose === POSE.SPECIAL && fighter.attack && fighter.poseT >= fighter.attack.startup) {
      fighter.x += fighter.facing * 520 * sdt;
      fighter.x = Math.max(ARENA_LEFT, Math.min(ARENA_RIGHT, fighter.x));
    }
  }

  events = resolveStrike(duel, duel.player, duel.foe, events, fx);
  events = resolveStrike(duel, duel.foe, duel.player, events, fx);
  events = stepProjectiles(duel, sdt, events, fx);
  events = checkBossPhase(duel, events);

  // Round end by KO or by the clock.
  let roundWinner = null;
  if (duel.player.hp <= 0 || duel.foe.hp <= 0) {
    roundWinner = duel.player.hp <= 0 ? duel.foe : duel.player;
    duel.slowmo = Math.max(duel.slowmo, 0.7);
  } else if (duel.timer <= 0) {
    duel.timer = 0;
    roundWinner = duel.player.hp >= duel.foe.hp ? duel.player : duel.foe;
    events |= EVENT_TIMER_END;
  }
  if (roundWinner) {
    roundWinner.roundsWon += 1;
    duel.roundWinner = roundWinner;
    duel.phase = 'roundEnd';
    duel.phaseT = 0;
    duel.banner = roundWinner === duel.player ? 'ROUND WON' : 'ROUND LOST';
    duel.bannerT = 1.5;
    if (roundWinner === duel.player) duel.player.pose = POSE.WIN;
    else duel.foe.pose = POSE.WIN;
    events |= EVENT_ROUND_END;
    if (roundWinner.roundsWon >= ROUNDS_TO_WIN) {
      duel.winner = roundWinner;
      duel.phase = 'done';
      duel.banner = roundWinner === duel.player ? 'VICTORY' : 'DEFEAT';
      duel.bannerT = 2;
      events |= EVENT_DUEL_END;
    }
  }
  return events;
}

// Begin the next round after a round break, keeping rounds won and meter.
export function nextRound(duel) {
  duel.round += 1;
  duel.timer = ROUND_TIME;
  duel.phase = 'intro';
  duel.phaseT = 0;
  duel.projectiles = [];
  duel.hitstop = 0;
  duel.slowmo = 0;
  duel.banner = `ROUND ${duel.round}`;
  duel.bannerT = 1.1;
  const playerMeter = duel.player.meter;
  const foeMeter = duel.foe.meter;
  resetForRound(duel.player, 430, 1);
  resetForRound(duel.foe, 850, -1);
  duel.player.meter = playerMeter;
  duel.foe.meter = foeMeter;
  duel.player.roundsWon = duel.player.roundsWon;
  duel.foe.roundsWon = duel.foe.roundsWon;
}

export function finisherReady(duel) {
  return (
    duel.player.meter >= METER_MAX &&
    duel.foe.hp <= duel.foe.maxHp * FINISHER_HP_FRACTION &&
    duel.phase === 'fight'
  );
}

export { STEP };
