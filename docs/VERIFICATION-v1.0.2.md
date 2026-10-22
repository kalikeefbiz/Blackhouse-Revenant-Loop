# v1.0.2 single-Echo recast verification — 2026-10-22

Exactly one spectral Echo is active. A successful recast replaces its movement and attack snapshot with the newest five-second memory, resets the attack cursor and lifespan, and starts the existing cooldown. Base cooldown remains 3.2 seconds; Fractured Hour still reaches 2.2 seconds over four ranks. Duration remains five seconds. Recorded world positions, weapon parameters, damage, arrival-blast upgrades, enemy targeting and emitted projectiles retain their existing behavior. Enemy, wave, weapon, save and upgrade balance were not changed.

The button shows RECORDING / READY / cooldown plus NO ECHO or the remaining ACTIVE duration. Recasts show a memory-renewal toast, pulse the button, play a distinct synthesized cue, and draw departure and arrival rings. Tutorial and help explain replacement.

## Validation

- All 29 unit cases pass, including natural cooldown timing at every rank, replacement snapshots, recorded attacks, a fresh five-second lifespan, and eight consecutive single-Echo recasts.
- Production TypeScript/Vite build and formatting checks pass.
- Desktop Chromium, mobile Chromium and iPhone 13 WebKit browser flows cover tutorial, controls, recast status, expiration, pause, save resilience, progression and victory UI. CDP multitouch is intentionally Chromium-only.
- Production smoke uses public controls without the development bridge at 320×568 in Chromium and WebKit.
- WebKit host libraries were downloaded from the configured Debian repository and extracted into the browser bundle because this environment cannot install system packages as root. Host validation is skipped for this local library setup; the actual WebKit engine executes the tests.

Physical iPhone performance and audio are not hardware-tested. BlackHouse integration adds a card to the existing Games page and preserves the two paused-development entries, navigation, stylesheet and other content.
