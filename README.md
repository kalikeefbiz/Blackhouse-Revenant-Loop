# REVENANT LOOP

**Every five seconds, your past becomes your ally.**

**Play:** https://blackhouse-revenant-loop.pages.dev/

A complete, mobile-first supernatural action roguelite for BlackHouse. Release v1.0.1: playable from tutorial through victory, with original procedural graphics and synthesized sound. No accounts, remote services, downloaded asset packs, or runtime dependencies.

## Play / develop

Node.js 22.12+ recommended.

```sh
npm ci
npm run dev
```

Open the displayed address. On desktop use **WASD / arrow keys**, **Space** to summon an Echo, **Escape / P** to pause. On a phone use the left joystick and right Echo button simultaneously. Weapons aim and fire automatically. Red lines and circles telegraph attacks. Move before summoning: a stationary memory produces stationary crossfire.

A new player gets a short interactive tutorial. After nine timed waves and nine upgrade selections, defeat the Hollow Sovereign’s three phases. Successful simulated runs currently take approximately 7½–8½ minutes, excluding time spent choosing upgrades. Death, end-run, victory, weapon selection and restart are functional.

## Build and checks

```sh
npm run build         # TypeScript check + deployable dist/
npm test              # deterministic mechanics and save tests
npx playwright install --with-deps chromium webkit
npm run test:e2e      # mobile Chromium, mobile WebKit, desktop Chromium
npm run balance      # nine seeded reactive-bot runs; not human playtesting
EXTENDED=1 npm run balance # six seeds per weapon; BUILD=echo or defense for varied boons
npm run format:check
npm run preview
```

Serve **the contents of `dist/`** from any static HTTPS host. No server, API keys, SPA routes or special rewrites are needed. Relative asset paths are the default, including for subdirectory hosting. No deployment to blackhouse.fun is configured or performed. Browser storage is origin-specific; changing hosts does not migrate progress.

## Content

- **Temporal Echo:** five seconds of recorded movement and attack events; replayed world positions, attack directions, weapon parameters, and timing. Echo damage begins at 65% and can be upgraded. Duration is five seconds. Base cooldown is 3.2 seconds; four Fractured Hour ranks each reduce it by 0.25 seconds, reaching 2.2 seconds. Up to two active Echoes; no AI-driven replay or simulation rewind. Enemies can be distracted by nearby ghosts.
- **Spectral Bolt:** rapid single-target projectiles; extra projectiles create a fan. **Crescent Blade:** broad close-range sweep with multi-target damage. **Void Lance:** slower piercing projectiles for lined-up enemies. Bolt starts unlocked; finishing a run unlocks Blade, reaching wave four unlocks Lance.
- **Six enemies:** pursuing Husks, telegraphed charging Hounds, ranged Archers, armored Brutes with delayed area slams, weaving Wraiths, and add-spawning Summoners. Summoners stop producing adds at wave cleanup.
- **Three chapters:** Ashen Cloister, Violet Ossuary, Crimson Eclipse. Each has a different palette and procedural architecture. Nine escalating randomized waves lead to the Hollow Sovereign, whose phases increase projectile density and attack frequency and summon reinforcements.
- **Fifteen repeatable boons:** damage, haste, max health, speed, Echo damage/cooldown, reach, extra shots, armor, kill healing, Echo arrival blasts, slowing, retaliation, critical attacks and recovery. Three distinct choices between waves; rank limits prevent useless overstacking.
- Health, invulnerability, knockback, enemy hit flashes, real projectile collisions, score, results, pause, settings, adaptive effects, sound toggle and local progression.

## Code map

| File | Responsibility |
| --- | --- |
| `src/game.ts` | Seeded simulation, event recording/replay, enemies, combat, waves, boss, upgrades |
| `src/main.ts` | Screen flow, pointer/keyboard controls, tutorial, HUD, progression integration |
| `src/render.ts` | Canvas arena art, original silhouettes, attacks, tells, particles, spectral effects |
| `src/audio.ts` | Gesture-unlocked Web Audio ambience and sound synthesis |
| `src/save.ts` | Versioned, validated, failure-tolerant localStorage |
| `tests/game.test.ts` | Mechanics and save regression tests |
| `tests/browser/play.spec.ts` | Browser flows and real CDP multitouch |
| `scripts/balance.ts` | Repeatable automated balance probe |

The renderer uses a 420×680 logical portrait arena, bounded device pixel ratio, capped particle counts and a reduced-effects fallback when frame times remain high. Simulation steps are capped at 50ms, projectile hits use swept segments to avoid tunneling, and backgrounding pauses play rather than fast-forwarding. Canvas + TypeScript was chosen instead of Phaser to keep the entire deployable client small (about 16KB gzipped JS/CSS/HTML before the favicon). The simulation is independent of DOM and can be reused in a later Capacitor wrapper.

The optional `?test` bridge exists **only in Vite development builds**. It lets browser tests reach otherwise lengthy run stages. Victory UI tests use this bridge; they do not claim to complete a manual run. The balance probe progresses through ordinary combat without health, damage, or time cheats.

## Save and audio behavior

The `blackhouse.revenant.v1` localStorage entry stores unlocks, high score, run/win counts, best wave, Echo milestone count, tutorial completion and settings. An active run is not resumed after reload. Corrupt/blocked storage falls back safely; failed writes display a notice. No tracking or analytics. Sound begins only after user input; silent mode remains fully playable.

## Release verification

See [verification notes](docs/VERIFICATION.md). The release passes 23 unit regressions and the mobile Chromium, mobile WebKit and desktop Chromium browser checks. Production smoke is reproducible with `npm run preview` then `npm run test:smoke`; set `SMOKE_URL` to check a deployed URL. Physical iPhone performance, audio, safe-area ergonomics and thermal behavior remain UNVERIFIED. Core gameplay, all content, assets, systems, and both endings are implemented. Crownfall Arena and the BlackHouse production site were not touched.

## Hosting

The dedicated Cloudflare Pages project configuration is recorded in `deploy/pages.json`: only this repository, production branch `main`, Node 22, `npm ci && npm run build`, output `dist`. No custom domain is configured. Public URL verification is recorded in `docs/VERIFICATION.md`. HTML revalidates; content-hashed assets cache immutably via `public/_headers`.
