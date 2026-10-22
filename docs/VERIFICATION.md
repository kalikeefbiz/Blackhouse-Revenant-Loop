# v1.0 release verification — 2026-10-22

Baseline: `1a95d38` (v0.8.0). Canvas/TypeScript + Vite retained. No changes to Crownfall Arena or blackhouse.fun.

## Executed checks

- `npm ci`, `npm run build`, `npm test`, `npm run format:check`: PASS. 23 unit cases cover all existing mechanics plus denied localStorage property access, a single ending on lethal Retaliation damage, and stationary play with automatic Echo for each weapon.
- `npm run test:e2e`: mobile Chromium, mobile WebKit, desktop Chromium. 16 passed; 2 intentional skips (CDP multitouch applies only to mobile Chromium). Tutorial, live input, Echo, pause, settings, defeat, unlocks, restart, all arenas and boss victory UI, denied storage, 320×568 menu, pointer cancellation, blur, resize and keyboard menu activation.
- `npm run test:smoke`: real production output in Chromium and WebKit at 320×568. Tutorial → movement → Echo → combat → pause/settings → end run → restart. No JavaScript/console errors, horizontal overflow or `__revenant` test bridge, even with `?test`.
- Browser victory UI uses development fixtures; it does not claim a human full-run victory. Complete combat simulations below use ordinary damage, health, attacks, Echo, waves and offered upgrades.
- Browser screenshots visually inspected: compact menu and production combat. Current captures in `docs/screenshots/release-*.png`; baseline screenshots retained for comparison.
- Production bundle approximately 16KB gzipped HTML/JS/CSS. Bounded DPR, adaptive low effects, cached arena graphics, capped simulation delta and particles preserved.

The container cannot install system packages as root. WebKit was launched with Debian libraries extracted locally into the downloaded browser's `sys/lib`. Playwright host validation was skipped because its system `ldconfig` lookup cannot see those local libraries. The actual WebKit browser ran and passed the tests; tests were not mocked or skipped for this workaround. Standard CI uses `npx playwright install --with-deps chromium webkit`.

## Balance and complete runs

54 deterministic reactive-bot runs: all three weapons × seeds 17, 42, 91, 7, 123, 2026 × standard, Echo-first, defense-first offered-upgrade priorities. Raw outputs and chosen upgrades are in `docs/balance/`. Run `EXTENDED=1 npm run balance`, with `BUILD=echo` or `BUILD=defense` for the other priorities. The default nine-run command was also executed.

| Priority | Bolt victories / 6 | Blade victories / 6 | Lance victories / 6 |
| --- | ---: | ---: | ---: |
| Standard | 3 | 4 | 5 |
| Echo-first | 0 | 3 | 1 |
| Defense-first | 1 | 2 | 2 |

Successful runs take 7:27–8:53 simulated active time, excluding boon selection. No stalled cleanup or boss softlock observed. Deaths occur normally. These are feasibility checks, not human win-rate estimates. Specialized builds are less forgiving; Echo-first Bolt's six defeats remain a balance limitation for human evaluation. Broad damage tuning was not justified by this limited controller sample. Blade wins four standard seeds, including all three additional seeds, so its original two boss defeats do not establish an unavoidable melee failure. Weapon values are unchanged.

Stationary play with automatic Echo fails for all three weapons in the regression seed. Recorded world positions/attack timing and decoy targeting are preserved: movement creates alternate firing lines and pulls nearby enemies toward ghosts. Boon rank caps and all fifteen effects retain coverage.

## Fixes and polish

- Storage property access is now inside the fallback boundary, preventing a launch crash when Safari/browser policy denies localStorage itself.
- Lethal incoming damage resolves defeat before Retaliation, preventing two terminal events, duplicate progression and competing ending screens.
- Space activates focused menu buttons; game keyboard handling no longer consumes menu input.
- Boss aimed volley now has three directional warning lines; the radial warning remains. Recorded Echo routes are more visible.
- Compact portrait typography/layout keeps Enter, Help and Settings visible at 320×568. Locked weapon text is more legible. Reduced-motion users avoid menu transitions.
- Closely overlapping identical sounds are throttled; kill sounds are softer and warning sounds clearer. Rejected audio resume/suspend promises do not become unhandled errors.

## Deployment

A dedicated Cloudflare Pages configuration is in `deploy/pages.json`; relative asset paths are built by default. `_headers` sets HTML revalidation, immutable hashed-asset caching, MIME sniffing protection and referrer policy. No custom domains or existing deployments are modified.

GitHub Pages creation was attempted and rejected with HTTP 403 `Resource not accessible by integration`; Cloudflare is the alternate authorized target. Public deployment and smoke result will be recorded here after verification.

## Explicit limitations

- Physical iPhone Safari performance, audio/silent-switch behavior, thermal behavior, browser-chrome safe areas and real multitouch ergonomics: **UNVERIFIED**. Mobile WebKit emulation is not a physical-device test.
- Browser lifecycle checks cover blur/pause, cancellation and resize; OS interruption and long background suspension require real-device follow-up.
- No human complete-run playtest or subjective listening session is claimed. Balance is simulation-based and intentionally challenging.
- Canvas combat remains primarily visual; menus and controls have descriptions, but full nonvisual accessibility is not claimed.
