import { Game, type Weapon } from "../src/game";
for (const weapon of ["bolt", "blade", "lance"] as Weapon[])
  for (const seed of [17, 42, 91]) {
    const g = new Game(weapon, seed);
    let steps = 0;
    const damageTaken: number[] = [];
    while (
      g.state !== "won" &&
      g.state !== "lost" &&
      g.time < 700 &&
      steps++ < 50000
    ) {
      if (g.state === "upgrade") {
        const priority = [
          "heal",
          "multi",
          "power",
          "haste",
          "armor",
          "echoPower",
          "health",
          "size",
          "cooldown",
          "revenge",
          "frost",
          "crit",
          "rest",
          "speed",
          "nova",
        ];
        const choice = [...g.choices].sort(
          (a, b) => priority.indexOf(a.id) - priority.indexOf(b.id),
        )[0];
        g.choose(choice.id);
        continue;
      }
      // Reactive directional search: keeps firing range while avoiding bodies and incoming projectiles.
      let best = { x: 0, y: 0 },
        value = -Infinity;
      for (let k = 0; k < 16; k++) {
        const x = Math.cos((k * Math.PI) / 8),
          y = Math.sin((k * Math.PI) / 8),
          px = g.player.x + x * 35,
          py = g.player.y + y * 35;
        let score = 0;
        if (px < 35 || px > 385 || py < 108 || py > 570) score -= 100;
        for (const e of g.enemies) {
          const d = Math.hypot(px - e.x, py - e.y);
          score -= 2000 / Math.max(10, d - e.r);
          if (e.wind > 0 && e.kind === "brute" && d < 90) score -= 30;
        }
        for (const s of g.shots)
          if (s.enemy) {
            const d = Math.hypot(
              px - (s.x + s.vx * 0.2),
              py - (s.y + s.vy * 0.2),
            );
            score -= 1000 / Math.max(10, d);
          }
        const nearest = g.enemies.reduce(
          (a, e) => Math.min(a, Math.hypot(px - e.x, py - e.y)),
          999,
        );
        if (weapon === "blade") score -= Math.abs(nearest - 75) * 0.45;
        else score -= Math.abs(nearest - 180) * 0.04;
        score -= Math.hypot(px - 210, py - 340) * 0.02;
        if (score > value) {
          value = score;
          best = { x, y };
        }
      }
      if (g.ready) g.summon();
      const hp = g.player.hp;
      g.update(1 / 60, best);
      if (g.player.hp < hp) damageTaken.push(hp - g.player.hp);
    }
    console.log(
      JSON.stringify({
        weapon,
        seed,
        state: g.state,
        time: Math.round(g.time),
        wave: g.wave,
        kills: g.kills,
        hp: Math.round(g.player.hp),
        echoKills: g.echoKills,
        damageTaken: Math.round(damageTaken.reduce((a, b) => a + b, 0)),
        levels: g.levels,
      }),
    );
  }
