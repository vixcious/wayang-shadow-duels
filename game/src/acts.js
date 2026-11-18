// The story spine: five acts, three duels each, a stage per act, and the
// three-phase Rahwana finale. Endless mode reuses the same ladder with a
// rising scale, so one duel engine serves both modes.
import { BOSS, ROSTER } from './fighters.js';

export const STAGES = [
  {
    id: 'forest',
    name: 'Whispering Forest',
    sky: ['#2b1a08', '#7a4a12', '#ffb347'],
    glow: '#ffcf7a',
    ground: '#3a2410',
    accent: '#5da85f',
    motes: 'firefly',
  },
  {
    id: 'palace',
    name: 'Golden Palace',
    sky: ['#1c0f2e', '#4a2160', '#c96bff'],
    glow: '#ffd977',
    ground: '#2c1a3a',
    accent: '#e8b4ff',
    motes: 'lantern',
  },
  {
    id: 'battlefield',
    name: 'Field of Fallen Banners',
    sky: ['#2e0d06', '#7a2408', '#ff6b35'],
    glow: '#ff9d5c',
    ground: '#3d1c0d',
    accent: '#c9452c',
    motes: 'ember',
  },
  {
    id: 'cliff',
    name: 'Ocean Cliff at Dusk',
    sky: ['#081c2e', '#144a6b', '#ff8a5c'],
    glow: '#ffb37a',
    ground: '#1c2f3a',
    accent: '#4db8d8',
    motes: 'gull',
  },
  {
    id: 'underworld',
    name: 'The Underworld Gate',
    sky: ['#0d0208', '#3a0a24', '#a3123a'],
    glow: '#ff4d6a',
    ground: '#20060f',
    accent: '#ff3b30',
    motes: 'soul',
  },
];

export const ACTS = [
  {
    name: 'ACT I — THE FOREST PATH',
    stage: 0,
    intro: 'Shadows stir between the trees. Three challengers bar the way.',
    foes: ['srikandi', 'arjuna', 'bima'],
    aiBoost: 0,
    healthScale: 0.9,
    reward: { coins: 40, favor: 10 },
  },
  {
    name: 'ACT II — THE GOLDEN PALACE',
    stage: 1,
    intro: 'The court watches. The lanterns burn brighter, and so do the blades.',
    foes: ['bima', 'kresna', 'gatotkaca'],
    aiBoost: 1,
    healthScale: 1.0,
    reward: { coins: 60, favor: 15 },
  },
  {
    name: 'ACT III — THE FALLEN FIELD',
    stage: 2,
    intro: 'Banners torn, drums low. Only the stubborn still stand here.',
    foes: ['gatotkaca', 'hanoman', 'arjuna'],
    aiBoost: 2,
    healthScale: 1.1,
    reward: { coins: 80, favor: 20 },
  },
  {
    name: 'ACT IV — THE OCEAN CLIFF',
    stage: 3,
    intro: 'Wind off the sea, salt on the screen. The gate is near.',
    foes: ['hanoman', 'srikandi', 'kresna'],
    aiBoost: 3,
    healthScale: 1.2,
    reward: { coins: 100, favor: 25 },
  },
  {
    name: 'ACT V — THE DEMON KING',
    stage: 4,
    intro: 'Rahwana waits behind the last screen. End the tale.',
    foes: ['bima', 'gatotkaca', 'rahwana'],
    aiBoost: 4,
    healthScale: 1.25,
    reward: { coins: 150, favor: 40 },
  },
];

export const TOTAL_DUELS = ACTS.reduce((sum, act) => sum + act.foes.length, 0);

export function duelAt(actIndex, duelIndex) {
  const act = ACTS[actIndex];
  const foeId = act.foes[duelIndex];
  const foe = foeId === 'rahwana' ? BOSS : ROSTER.find((entry) => entry.id === foeId);
  return {
    act,
    actIndex,
    duelIndex,
    foe,
    isBoss: foeId === 'rahwana',
    stage: STAGES[act.stage],
    aiBoost: act.aiBoost,
    healthScale: act.healthScale,
  };
}

// Endless: an endless ladder of foes with rising health and damage. Every
// fifth level is the Demon King himself, so the ladder has a rhythm.
export function endlessFoe(level, rng) {
  const isBossLevel = level % 5 === 0;
  const foe = isBossLevel ? BOSS : ROSTER[rng.int(ROSTER.length)];
  return {
    foe,
    isBoss: isBossLevel,
    stage: STAGES[rng.int(STAGES.length)],
    healthScale: 0.9 + level * 0.09,
    damageScale: 0.85 + level * 0.05,
    aiBoost: Math.min(5, Math.floor(level / 2)),
  };
}

export function actClearedUnlock(actIndex) {
  // Clearing act N (0-based) wakes the puppet whose unlock names act N+1.
  return ROSTER.filter((entry) => entry.unlock && entry.unlock.act === actIndex + 1).map((entry) => entry.id);
}
