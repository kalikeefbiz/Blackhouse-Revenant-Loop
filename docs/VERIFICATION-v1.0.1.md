# v1.0.1 Echo balance verification — 2026-10-22

Base Echo cooldown is exactly 3.2 seconds; lifespan remains five seconds. Fractured Hour has four useful ranks: 2.95, 2.70, 2.45 and 2.20 seconds. The existing rank cap excludes further offers. Independent movement snapshots, attack cursors, world-space attacks, damage, enemy targeting and two-active limit are retained. Readiness now also checks capacity; the HUD shows FULL when two Echoes occupy both slots after cooldown expires. Help and build number reflect the release. Save schema/key and progression are unchanged.

## Validation

- Build, formatting and all 28 unit/regression cases pass. Natural-overlap cases advance ordinary simulation time without resetting cooldown at every rank, check separate movement/attack snapshots, both attack cursors, attack execution, and independent five-second expiration. A maximum-investment case lets cooldown expire with two active Echoes and proves a third is rejected.
- All browser cases pass across desktop Chromium, mobile Chromium and iPhone 13 WebKit: 19 passed, two intentional skips for CDP multitouch outside mobile Chromium. New browser case waits for real-time cooldown and checks RECORDING, READY, countdown, 1/2 → 2/2 → 1/2 active transitions. Existing tutorial, input, pause, progression, victory UI, save resilience, compact layout and lifecycle cases pass.
- WebKit initially could not launch due to missing host libraries. Debian packages were downloaded and extracted into the browser bundle's sys/lib without root access. Host validation was bypassed only because it does not detect these local libraries; real WebKit executed successfully.
- 54 deterministic full-run balance simulations completed: three weapons × six seeds × standard, Echo and defense priorities. Wins per six for Bolt/Blade/Lance: standard 3/6/4; Echo 1/2/3; defense 1/2/3. Raw results are in balance/v1.0.1. Echo-focused wins include substantial late-wave Echo kills; deaths remain normal. Regression cases confirm stationary automatic-Echo play loses with every weapon. These simulations establish feasibility, not human win rates.
- Production smoke checks both Chromium and WebKit at 320×568, using public controls and no test bridge, including natural two-Echo overlap, tutorial, movement, settings, defeat and restart; no console errors or horizontal overflow.

Physical iPhone hardware, subjective human balance and audio testing remain unverified. Crownfall Arena and the main BlackHouse website were not modified.
