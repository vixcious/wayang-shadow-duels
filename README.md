# WAYANG — Shadow-Puppet Duels

[![make.fun best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01)
[![rank](https://make.fun/badge/best-game-01/vixcious/wayang-shadow-duels/rank.svg)](https://make.fun/c/best-game-01)
[![reward](https://make.fun/badge/best-game-01/vixcious/wayang-shadow-duels/reward.svg)](https://make.fun/c/best-game-01)

A wayang kulit shadow-puppet arena fighter, entered in the [best-game-01 bounty on make.fun](https://make.fun/c/best-game-01). Two ornate black-and-gold cutout puppets duel on a backlit screen: warm amber glow, visible dalang control rods, a gamelan orchestra in silhouette along the bottom, and a carved frame around it all.

## The game

**WAYANG — duel behind the glowing screen: 6 puppets, 5 acts, Rahwana 3-phase boss, Endless, gamelan steel.**

- **6 playable puppets** — Arjuna, Bima, Srikandi, Gatotkaca, Hanoman and Kresna — each with distinct stats and a signature special art. Three are unlocked from the start; three unlock by clearing acts.
- **5 acts × 3 duels**, each act on its own stage (forest, palace, battlefield, ocean cliff, underworld) with escalating AI, ending in **Rahwana, a 3-phase final boss**.
- **Combat**: move, jump, crouch/block, light and heavy attacks, dash/dodge, special arts on a meter, combo counter with scaling, hit-stop, screen shake, gold hit sparks, floating damage numbers, round pips, a round timer, KO slow-mo and a FINISHER READY state.
- **3 difficulties** plus an **Endless ladder** with score.
- **Progression**: coins and audience favor from duels buy upgrades (damage, health, meter gain, new arts) in the shop between duels. Victory and defeat screens carry run stats and a restart.
- **Sound**: WebAudio-synthesized gamelan only — pentatonic metallophone plucks, kendang drums, gong on round start and KO, hit effects, crowd swell on finishers. No audio files.
- **Controls**: A/D or arrows to move, W to jump, S to block, J light, K heavy, L special, Shift dash, P pause, M sound — plus clickable on-screen buttons for everything.

## Run it

The game is plain static files: `game/index.html` plus ES modules, zero libraries, zero network requests. Serve the `game/` folder any way you like, or run the kit's server from the repo root:

```sh
node serve.ts
```

then open <http://localhost:8080>. Screenshot states are staged deterministically through the game's own functions: `?shot=1` mid-duel, `?shot=2` title, `?shot=3` boss, `?shot=4` victory and shop.

## Layout

- `game/src/main.js` — boot, fixed-step loop, screen state machine
- `game/src/fighter.js` — puppet physics, attacks, hit resolution
- `game/src/fighters.js` — the 6-puppet roster and the boss
- `game/src/combat.js` — duel flow: rounds, timer, hit-stop, phases
- `game/src/ai.js` — the dalang AI and the autopilot
- `game/src/acts.js` — acts, stages, the Endless ladder
- `game/src/stages.js` — painted backdrops, carved frame, gamelan
- `game/src/puppet.js` — the cutout puppets, crowns, weapons, rods
- `game/src/render.js` — HUD, menus, shop, all screens
- `game/src/audio.js` — synthesized gamelan and effects
- `game/src/particles.js` — sparks, dust, floating text, shake
- `game/src/progress.js` — coins, favor, unlocks, upgrades
- `game/src/input.js` — keyboard and pointer
- `game/src/shots.js` — the deterministic screenshot states
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to the output directory and writes `dossier.json`

## License

MIT — see [LICENSE](LICENSE).
