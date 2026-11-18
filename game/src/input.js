// Input: keyboard state with edge detection, plus pointer clicks mapped into
// stage coordinates (the canvas is scaled to fit the window, so clicks need
// the bounding-rect transform). Touch pads set held buttons; the game reads
// one polled snapshot per frame.
import { KEYS, VIEW_H, VIEW_W } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SOUND = 4;
export const ACTION_SPEED = 8;

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const padHeld = new Set();
  const clicks = [];
  let pointer = { x: -1, y: -1 };

  function toStage(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW_W,
      y: ((clientY - rect.top) / rect.height) * VIEW_H,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    pressed.add(event.code);
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    padHeld.clear();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const point = toStage(event.clientX, event.clientY);
    pointer = point;
    clicks.push(point);
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    pointer = toStage(event.clientX, event.clientY);
  });
  canvas.addEventListener('pointerup', () => {
    padHeld.clear();
  });
  canvas.addEventListener('pointercancel', () => {
    padHeld.clear();
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function down(codes) {
    return codes.some((code) => held.has(code));
  }
  function hit(codes) {
    return codes.some((code) => pressed.has(code));
  }

  return {
    // Held movement + edge-triggered strikes, merged with the touch pads.
    poll() {
      const pad = (id) => padHeld.has(id);
      const snapshot = {
        left: down(KEYS.left) || pad('pad-left'),
        right: down(KEYS.right) || pad('pad-right'),
        jump: hit(KEYS.jump) || pad('pad-jump'),
        block: down(KEYS.block) || pad('pad-block'),
        light: hit(KEYS.light) || pad('pad-light'),
        heavy: hit(KEYS.heavy) || pad('pad-heavy'),
        special: hit(KEYS.special) || pad('pad-special'),
        dash: hit(KEYS.dash) || pad('pad-dash') || pad('pad-dash-r'),
        actions: 0,
      };
      if (hit(KEYS.confirm)) snapshot.actions |= ACTION_CONFIRM;
      if (hit(KEYS.pause)) snapshot.actions |= ACTION_PAUSE;
      if (hit(KEYS.sound)) snapshot.actions |= ACTION_SOUND;
      if (hit(KEYS.speed)) snapshot.actions |= ACTION_SPEED;
      pressed.clear();
      return snapshot;
    },
    // Buttons held by pointer: the game marks pad buttons held while pressed.
    setPad(id, isHeld) {
      if (isHeld) padHeld.add(id);
      else padHeld.delete(id);
    },
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
    pointer() {
      return pointer;
    },
  };
}
