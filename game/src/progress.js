// Run progression: coins and audience favor earned in duels, the upgrade shop,
// puppet unlocks and best scores. Storage is guarded so private windows and
// the headless trial never throw.
import { PROGRESS_KEY } from './config.js';
import { ROSTER, startingRoster } from './fighters.js';
import { actClearedUnlock } from './acts.js';

export const UPGRADES = [
  { id: 'damage', name: 'SHARPENED GOLD', desc: '+12% damage, every blow', cost: 60, max: 3, icon: 'sword' },
  { id: 'health', name: 'THICK LEATHER', desc: '+15% max health', cost: 60, max: 3, icon: 'shield' },
  { id: 'meter', name: 'DALANG’S FAVOR', desc: '+20% meter gain', cost: 50, max: 3, icon: 'star' },
  { id: 'art', name: 'MASTER THE ART', desc: '+25% special damage', cost: 80, max: 2, icon: 'flame' },
];

export function createProgress() {
  return {
    coins: 0,
    favor: 0,
    upgrades: { damage: 0, health: 0, meter: 0, art: 0 },
    unlocked: startingRoster(),
    bestScore: 0,
    endlessBest: 0,
    actsCleared: 0,
    duelsWon: 0,
  };
}

export function loadProgress() {
  const progress = createProgress();
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return progress;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.unlocked)) {
      for (const id of saved.unlocked) {
        if (!progress.unlocked.includes(id) && ROSTER.some((entry) => entry.id === id)) progress.unlocked.push(id);
      }
    }
    progress.bestScore = Number(saved.bestScore) || 0;
    progress.endlessBest = Number(saved.endlessBest) || 0;
    progress.actsCleared = Number(saved.actsCleared) || 0;
  } catch {
    // Storage unavailable: play with a fresh slate.
  }
  return progress;
}

export function saveProgress(progress) {
  try {
    window.localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({
        unlocked: progress.unlocked,
        bestScore: progress.bestScore,
        endlessBest: progress.endlessBest,
        actsCleared: progress.actsCleared,
      }),
    );
  } catch {
    // Ignore storage failures.
  }
}

export function isUnlocked(progress, fighterId) {
  return progress.unlocked.includes(fighterId);
}

export function earnRewards(progress, actIndex, duelIndex, score, won) {
  const coins = won ? 30 + actIndex * 12 + duelIndex * 6 : 8;
  const favor = won ? 6 + actIndex * 2 : 1;
  progress.coins += coins;
  progress.favor += favor;
  if (won) progress.duelsWon += 1;
  return { coins, favor, score };
}

export function buyUpgrade(progress, upgradeId) {
  const def = UPGRADES.find((entry) => entry.id === upgradeId);
  if (!def) return false;
  if (progress.upgrades[upgradeId] >= def.max) return false;
  if (progress.coins < def.cost) return false;
  progress.coins -= def.cost;
  progress.upgrades[upgradeId] += 1;
  return true;
}

export function applyActClear(progress, actIndex) {
  progress.actsCleared = Math.max(progress.actsCleared, actIndex + 1);
  const newly = actClearedUnlock(actIndex).filter((id) => !progress.unlocked.includes(id));
  for (const id of newly) progress.unlocked.push(id);
  return newly;
}

export function recordBest(progress, score, endlessLevel) {
  progress.bestScore = Math.max(progress.bestScore, score);
  if (typeof endlessLevel === 'number') progress.endlessBest = Math.max(progress.endlessBest, endlessLevel);
  saveProgress(progress);
}
