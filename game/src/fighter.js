// A fighter on the screen: position, pose state, health, meter and the attack
// timeline. Pure simulation — no canvas, no audio — so the headless trial can
// run whole duels through this module alone.
import { ARENA_LEFT, ARENA_RIGHT, GROUND_Y, METER_MAX } from './config.js';

export const POSE = {
  IDLE: 'idle',
  WALK: 'walk',
  JUMP: 'jump',
  CROUCH: 'crouch',
  BLOCK: 'block',
  DASH: 'dash',
  LIGHT: 'light',
  HEAVY: 'heavy',
  SPECIAL: 'special',
  HIT: 'hit',
  BLOCKSTUN: 'blockstun',
  KO: 'ko',
  WIN: 'win',
  INTRO: 'intro',
};

const GRAVITY = 2600;
const DASH_TIME = 0.16;
const DASH_SPEED = 900;
const DASH_COOLDOWN = 0.55;

export function createFighter(def, x, facing, upgrades) {
  const bonus = upgrades ?? { damage: 0, health: 0, meter: 0, art: 0 };
  const maxHp = Math.round(def.health * (1 + 0.15 * bonus.health));
  return {
    def,
    x,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    facing,
    hp: maxHp,
    maxHp,
    meter: 20,
    pose: POSE.INTRO,
    poseT: 0,
    attack: null,
    attackHitDone: false,
    specialFired: false,
    specialHitsLeft: 0,
    specialHitTimer: 0,
    airborne: false,
    blocking: false,
    dashCd: 0,
    hitstop: 0,
    roundsWon: 0,
    combo: 0,
    comboT: 0,
    bestCombo: 0,
    damageDealt: 0,
    koT: 0,
    introT: 0.9,
    powerScale: 1 + 0.12 * bonus.damage,
    meterScale: 1 + 0.2 * bonus.meter,
    artLevel: bonus.art,
    width: 64 * def.art.bulk,
    height: 190 * (def.boss ? 1.22 : 1),
    flashT: 0,
    armorT: 0,
  };
}

export function resetForRound(fighter, x, facing) {
  fighter.x = x;
  fighter.y = GROUND_Y;
  fighter.vx = 0;
  fighter.vy = 0;
  fighter.facing = facing;
  fighter.hp = fighter.maxHp;
  fighter.meter = 20;
  fighter.pose = POSE.INTRO;
  fighter.poseT = 0;
  fighter.attack = null;
  fighter.attackHitDone = false;
  fighter.specialFired = false;
  fighter.specialHitsLeft = 0;
  fighter.airborne = false;
  fighter.blocking = false;
  fighter.dashCd = 0;
  fighter.combo = 0;
  fighter.comboT = 0;
  fighter.koT = 0;
  fighter.introT = 0.9;
  fighter.flashT = 0;
  fighter.armorT = 0;
}

function startAttack(fighter, kind) {
  const data = fighter.def[kind];
  fighter.pose = kind === 'light' ? POSE.LIGHT : kind === 'heavy' ? POSE.HEAVY : POSE.SPECIAL;
  fighter.poseT = 0;
  fighter.attack = { kind, ...data };
  fighter.attackHitDone = false;
  fighter.specialFired = false;
  fighter.vx = 0;
  if (kind === 'special') {
    // Specials carry no timing in the roster defs, so the strike gets its own:
    // a visible windup, an active window that fits multi-hit arts, and a
    // recovery the foe can punish. Without these the pose never resolves.
    const special = fighter.def.special;
    fighter.attack.startup = 0.28;
    fighter.attack.active = special.hits ? 0.09 * special.hits + 0.12 : 0.18;
    fighter.attack.recovery = 0.34;
    fighter.attack.range = 130;
    fighter.attack.knock = 300;
    fighter.meter = Math.max(0, fighter.meter - special.meter);
    if (special.hits) {
      fighter.specialHitsLeft = special.hits;
      fighter.specialHitTimer = 0;
    }
    if (special.armored) fighter.armorT = 0.7;
  }
}

export function fighterCanAct(fighter) {
  return (
    fighter.pose === POSE.IDLE ||
    fighter.pose === POSE.WALK ||
    fighter.pose === POSE.CROUCH ||
    fighter.pose === POSE.BLOCK
  );
}

export function fighterIsAttacking(fighter) {
  return fighter.pose === POSE.LIGHT || fighter.pose === POSE.HEAVY || fighter.pose === POSE.SPECIAL;
}

export function attackIsActive(fighter) {
  if (!fighter.attack) return false;
  const t = fighter.poseT;
  return t >= fighter.attack.startup && t <= fighter.attack.startup + fighter.attack.active;
}

// The striking hitbox while an attack is active, in stage coordinates.
export function attackHitbox(fighter) {
  if (!fighter.attack || !attackIsActive(fighter)) return null;
  const reach = fighter.attack.range * fighter.def.reach;
  const front = fighter.x + fighter.facing * (fighter.width * 0.4);
  const x0 = fighter.facing > 0 ? front : front - reach;
  return {
    x: x0,
    y: fighter.y - fighter.height * 0.78,
    w: reach,
    h: fighter.height * 0.62,
  };
}

export function hurtbox(fighter) {
  const crouched = fighter.pose === POSE.CROUCH || fighter.pose === POSE.BLOCK;
  const h = fighter.height * (crouched ? 0.62 : 0.92);
  return { x: fighter.x - fighter.width * 0.42, y: fighter.y - h, w: fighter.width * 0.84, h };
}

export function applyHit(fighter, damage, knock, attacker, opts) {
  const options = opts ?? {};
  if (fighter.armorT > 0 && !options.unblockable) damage *= 0.45;
  let dealt = damage;
  let blocked = false;
  if (fighter.blocking && fighter.facing === -attacker.facing && !options.unblockable) {
    dealt = Math.max(1, Math.round(damage * 0.18));
    blocked = true;
    fighter.pose = POSE.BLOCKSTUN;
    fighter.poseT = 0;
    fighter.vx = attacker.facing * knock * 0.25;
  } else {
    fighter.pose = POSE.HIT;
    fighter.poseT = 0;
    fighter.attack = null;
    fighter.vx = attacker.facing * knock * (1 / fighter.def.weight);
    if (options.launcher) {
      fighter.vy = -620;
      fighter.airborne = true;
    }
  }
  fighter.hp = Math.max(0, fighter.hp - Math.round(dealt));
  fighter.flashT = 0.12;
  if (fighter.hp <= 0) {
    fighter.pose = POSE.KO;
    fighter.poseT = 0;
    fighter.koT = 0;
    fighter.vx = attacker.facing * knock * 0.55;
  }
  return { dealt: Math.round(dealt), blocked, ko: fighter.hp <= 0 };
}

export function gainMeter(fighter, amount) {
  fighter.meter = Math.min(METER_MAX, fighter.meter + amount * fighter.meterScale);
}

// One fixed step of a single fighter: input, gravity, pose timers, bounds.
export function stepFighter(fighter, input, dt, foe) {
  fighter.poseT += dt;
  fighter.flashT = Math.max(0, fighter.flashT - dt);
  fighter.armorT = Math.max(0, fighter.armorT - dt);
  fighter.dashCd = Math.max(0, fighter.dashCd - dt);
  fighter.comboT = Math.max(0, fighter.comboT - dt);
  if (fighter.comboT <= 0) fighter.combo = 0;

  if (fighter.pose === POSE.INTRO) {
    fighter.introT -= dt;
    if (fighter.introT <= 0) {
      fighter.pose = POSE.IDLE;
      fighter.poseT = 0;
    }
    return;
  }
  if (fighter.pose === POSE.KO || fighter.pose === POSE.WIN) {
    fighter.koT += dt;
    fighter.x += fighter.vx * dt;
    fighter.vx *= 1 - 4 * dt;
    fighter.x = Math.max(ARENA_LEFT, Math.min(ARENA_RIGHT, fighter.x));
    return;
  }

  // Face the foe whenever free to turn.
  if (fighterCanAct(fighter) && foe) {
    fighter.facing = foe.x >= fighter.x ? 1 : -1;
  }

  fighter.blocking = false;
  if (fighterCanAct(fighter)) {
    if (input.block && !fighter.airborne) {
      fighter.pose = POSE.BLOCK;
      fighter.poseT = 0;
      fighter.blocking = true;
      fighter.vx = 0;
    } else if (input.light) startAttack(fighter, 'light');
    else if (input.heavy) startAttack(fighter, 'heavy');
    else if (input.special && fighter.meter >= fighter.def.special.meter) startAttack(fighter, 'special');
    else if (input.dash && fighter.dashCd <= 0 && !fighter.airborne) {
      fighter.pose = POSE.DASH;
      fighter.poseT = 0;
      fighter.dashCd = DASH_COOLDOWN;
      fighter.vx = fighter.facing * DASH_SPEED * (input.left ? -1 : 1);
    } else if (input.jump && !fighter.airborne) {
      fighter.vy = -fighter.def.jump;
      fighter.airborne = true;
      fighter.pose = POSE.JUMP;
      fighter.poseT = 0;
    } else if (input.block) {
      fighter.pose = POSE.CROUCH;
      fighter.poseT = 0;
    } else if (input.left || input.right) {
      const dir = input.left ? -1 : 1;
      fighter.vx = dir * fighter.def.speed;
      fighter.pose = POSE.WALK;
    } else if (!fighter.airborne) {
      fighter.vx = 0;
      fighter.pose = POSE.IDLE;
    }
  } else if (fighter.pose === POSE.BLOCK) {
    if (!input.block) {
      fighter.pose = POSE.IDLE;
      fighter.poseT = 0;
    } else {
      fighter.blocking = true;
      fighter.vx = 0;
    }
  } else if (fighter.pose === POSE.CROUCH) {
    fighter.vx = 0;
    if (!input.block) {
      fighter.pose = POSE.IDLE;
      fighter.poseT = 0;
    }
  } else if (fighter.pose === POSE.DASH) {
    if (fighter.poseT >= DASH_TIME) {
      fighter.pose = POSE.IDLE;
      fighter.poseT = 0;
      fighter.vx = 0;
    }
  } else if (fighterIsAttacking(fighter)) {
    const total = fighter.attack.startup + fighter.attack.active + fighter.attack.recovery;
    if (fighter.poseT >= total) {
      fighter.pose = POSE.IDLE;
      fighter.poseT = 0;
      fighter.attack = null;
    }
  } else if (fighter.pose === POSE.HIT) {
    fighter.vx *= 1 - 6 * dt;
    if (fighter.poseT >= 0.28) {
      fighter.pose = POSE.IDLE;
      fighter.poseT = 0;
    }
  } else if (fighter.pose === POSE.BLOCKSTUN) {
    fighter.vx *= 1 - 8 * dt;
    if (fighter.poseT >= 0.16) {
      fighter.pose = POSE.IDLE;
      fighter.poseT = 0;
    }
  }

  // Gravity and ground.
  if (fighter.airborne || fighter.y < GROUND_Y) {
    fighter.vy += GRAVITY * dt;
    fighter.y += fighter.vy * dt;
    if (fighter.y >= GROUND_Y) {
      fighter.y = GROUND_Y;
      fighter.vy = 0;
      fighter.airborne = false;
      if (fighter.pose === POSE.JUMP) {
        fighter.pose = POSE.IDLE;
        fighter.poseT = 0;
      }
    }
  }

  // Air drift while jumping.
  if (fighter.airborne && fighterCanAct(fighter)) {
    if (input.left) fighter.vx = -fighter.def.speed * 0.85;
    else if (input.right) fighter.vx = fighter.def.speed * 0.85;
  }

  fighter.x += fighter.vx * dt;
  fighter.x = Math.max(ARENA_LEFT, Math.min(ARENA_RIGHT, fighter.x));

  // Body push: fighters never overlap.
  if (foe && Math.abs(foe.x - fighter.x) < (fighter.width + foe.width) * 0.36) {
    const push = ((fighter.width + foe.width) * 0.36 - Math.abs(foe.x - fighter.x)) / 2;
    const dir = fighter.x < foe.x ? -1 : 1;
    fighter.x = Math.max(ARENA_LEFT, Math.min(ARENA_RIGHT, fighter.x + dir * push));
  }
}

export function emptyInput() {
  return { left: false, right: false, jump: false, block: false, light: false, heavy: false, special: false, dash: false };
}
