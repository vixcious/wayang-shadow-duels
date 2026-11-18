// WAYANG — shadow-puppet arena fighter. Shared tuning, palette and key bindings.
// The game draws at a fixed logical stage of 1280x720 and scales to the window.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const STEP = 1 / 60;
export const GROUND_Y = 566;
export const ARENA_LEFT = 130;
export const ARENA_RIGHT = 1150;
export const ROUND_TIME = 60;
export const ROUNDS_TO_WIN = 2;
export const COMBO_WINDOW = 1.25;
export const METER_MAX = 100;
export const SPECIAL_COST = 50;
export const FINISHER_HP_FRACTION = 0.25;

// Canvas palette: the kelir screen glows warm amber; puppets are near-black
// silhouettes edged in gold. Every stage reuses these anchor colours.
export const PALETTE = {
  ink: '#140b06',
  inkSoft: '#241407',
  gold: '#f2c14e',
  goldBright: '#ffe08a',
  goldDim: '#9a7422',
  amber: '#ff9d2e',
  ember: '#ff5a1f',
  cream: '#fff3d6',
  paper: '#f7e3b0',
  red: '#e0342b',
  jade: '#3fae7c',
  violet: '#8a5cff',
  ocean: '#2e86ab',
  shadow: 'rgba(20, 8, 2, 0.55)',
};

export const KEYS = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['KeyW', 'ArrowUp'],
  block: ['KeyS', 'ArrowDown'],
  light: ['KeyJ'],
  heavy: ['KeyK'],
  special: ['KeyL'],
  dash: ['ShiftLeft', 'ShiftRight', 'Space'],
  pause: ['KeyP', 'Escape'],
  sound: ['KeyM'],
  speed: ['KeyT'],
  confirm: ['Enter'],
};

export const DIFFICULTIES = [
  { id: 'apprentice', name: 'APPRENTICE', desc: 'Slow foe, gentle hits', reaction: 0.55, aggression: 0.35, blockChance: 0.1, damageScale: 0.8, speedScale: 0.9 },
  { id: 'dalang', name: 'DALANG', desc: 'A fair duel, as told', reaction: 0.35, aggression: 0.55, blockChance: 0.25, damageScale: 1.0, speedScale: 1.0 },
  { id: 'legend', name: 'LEGEND', desc: 'Merciless. For masters only', reaction: 0.18, aggression: 0.8, blockChance: 0.45, damageScale: 1.2, speedScale: 1.12 },
];

export const BEST_KEY = 'wayang_best_score_v1';
export const PROGRESS_KEY = 'wayang_progress_v1';
