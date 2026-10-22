import { describe, it, expect } from "vitest";
import { Game, Recorder, UPGRADES, type Weapon } from "../src/game";
import { defaults, readSave, writeSave } from "../src/save";
function advance(g: Game, seconds: number, input = { x: 0, y: 0 }) {
  for (let i = 0; i < seconds * 60; i++) g.update(1 / 60, input);
}
describe("temporal memory", () => {
  it("requires five seconds and snapshots immutable relative timestamps", () => {
    const r = new Recorder();
    expect(r.snapshot(0)).toBeNull();
    for (let i = 0; i <= 360; i++) {
      r.record({ t: i / 60, x: i, y: 0, angle: 0 });
      if (i === 180 || i === 330)
        r.attack({
          t: i / 60,
          x: i,
          y: 0,
          angle: 1,
          weapon: "bolt",
          damage: 18,
          size: 1,
          count: 1,
        });
    }
    const e = r.snapshot(6)!;
    expect(e.frames[0].t).toBeCloseTo(0);
    expect(e.attacks.map((a) => a.t)).toEqual([2, 4.5]);
    r.clear();
    expect(e.frames.length).toBeGreaterThan(290);
    expect(e.attacks).toHaveLength(2);
  });
  it("replays the recorded position and fires at the recorded time, with real damage", () => {
    const g = new Game();
    g.spawnTimer = 999;
    for (let i = 0; i < 300; i++)
      g.update(1 / 60, { x: i < 150 ? 1 : -1, y: 0 });
    g.recorder.attacks = [
      {
        t: 1,
        x: 200,
        y: 200,
        angle: 0,
        weapon: "lance",
        damage: 100,
        size: 1,
        count: 1,
      },
    ];
    expect(g.summon()).toBe(true);
    g.player.x = 40;
    g.player.y = 500;
    g.attackTimer = 999;
    const enemy = g.spawn("brute", 240, 200);
    enemy.speed = 0;
    enemy.timer = 999;
    const hp = enemy.hp;
    advance(g, 0.8);
    expect(enemy.hp).toBe(hp);
    advance(g, 0.5);
    expect(enemy.hp).toBeLessThan(hp);
    expect(g.echoes[0].x).not.toBe(g.player.x);
    advance(g, 4);
    expect(g.echoes).toHaveLength(0);
  });
  it("enforces cooldown and two active echo maximum", () => {
    const g = new Game();
    g.spawnTimer = 999;
    advance(g, 5.1);
    expect(g.summon()).toBe(true);
    expect(g.summon()).toBe(false);
    g.cooldown = 0;
    expect(g.summon()).toBe(true);
    g.cooldown = 0;
    expect(g.summon()).toBe(false);
  });
});
describe("combat and progression", () => {
  it.each(["bolt", "blade", "lance"] as Weapon[])(
    "%s deals damage",
    (weapon) => {
      const g = new Game(weapon);
      g.spawnTimer = 999;
      const e = g.spawn("brute", g.player.x + 50, g.player.y);
      e.speed = 0;
      advance(g, 1);
      expect(e.hp).toBeLessThan(e.max);
    },
  );
  it("lance penetrates two enemies while bolt stops at the first", () => {
    for (const weapon of ["bolt", "lance"] as Weapon[]) {
      const g = new Game(weapon);
      g.spawnTimer = 999;
      g.attackTimer = 999;
      const a = g.spawn("brute", 170, 200),
        b = g.spawn("brute", 230, 200);
      a.speed = b.speed = 0;
      g.attack({
        t: 0,
        x: 100,
        y: 200,
        angle: 0,
        weapon,
        damage: 20,
        size: 1,
        count: 1,
      });
      advance(g, 0.5);
      expect(a.hp).toBeLessThan(a.max);
      expect(b.hp < b.max).toBe(weapon === "lance");
    }
  });
  it("damage respects invulnerability, armor, defeat and restart", () => {
    const g = new Game();
    g.damagePlayer(20, { x: 0, y: 0 });
    expect(g.player.hp).toBe(80);
    g.damagePlayer(20, { x: 0, y: 0 });
    expect(g.player.hp).toBe(80);
    g.player.inv = 0;
    g.apply("armor");
    g.damagePlayer(20, { x: 0, y: 0 });
    expect(g.player.hp).toBe(62);
    g.player.inv = 0;
    g.damagePlayer(1000, { x: 0, y: 0 });
    expect(g.state).toBe("lost");
    const time = g.time;
    advance(g, 1);
    expect(g.time).toBe(time);
    expect(new Game().player.hp).toBe(100);
  });
  it("offers distinct boons, applies all fifteen, and advances chapters", () => {
    const g = new Game();
    for (const u of UPGRADES) g.apply(u.id);
    expect(Object.keys(g.levels)).toHaveLength(15);
    expect(g.damage).toBeGreaterThan(18);
    expect(g.player.max).toBe(133);
    for (let i = 1; i < 10; i++) {
      g.between();
      expect(new Set(g.choices.map((c) => c.id)).size).toBe(3);
      expect(g.choose(g.choices[0].id)).toBe(true);
      expect(g.wave).toBe(i + 1);
    }
    expect(g.arena).toBe(2);
    advance(g, 0.1);
    expect(g.enemies.some((e) => e.kind === "boss")).toBe(true);
  });
  it("boss transitions through phases and victory is reachable", () => {
    const g = new Game();
    g.wave = 10;
    advance(g, 0.1);
    const boss = g.enemies[0];
    g.hurt(boss, boss.max * 0.35, false);
    advance(g, 0.1);
    expect(boss.phase).toBe(2);
    g.hurt(boss, boss.max * 0.34, false);
    advance(g, 0.1);
    expect(boss.phase).toBe(3);
    g.hurt(boss, 99999, true);
    expect(g.state).toBe("won");
    expect(g.echoKills).toBe(1);
  });
  it("each enemy archetype can threaten the player", () => {
    for (const kind of [
      "husk",
      "hound",
      "archer",
      "brute",
      "wraith",
      "summoner",
      "boss",
    ] as const) {
      const g = new Game();
      g.spawnTimer = 999;
      g.attackTimer = 999;
      g.player.max = g.player.hp = 10000;
      g.spawn(kind, g.player.x + 35, g.player.y);
      advance(g, 12);
      expect(g.player.hp, kind).toBeLessThan(10000);
    }
  });
  it("wave clock is between seven and eight minutes before final combat", () => {
    const g = new Game();
    let duration = 0;
    for (let i = 1; i <= 9; i++) {
      g.wave = i;
      duration += g.waveDuration;
    }
    expect(duration).toBeGreaterThanOrEqual(400);
    expect(duration).toBeLessThan(480);
  });
});
describe("save resilience", () => {
  it("round trips settings and unlocks", () => {
    let data = "";
    const storage = {
      getItem: () => data,
      setItem: (_: string, v: string) => {
        data = v;
      },
    };
    const s = defaults();
    s.unlocked.push("blade");
    s.highScore = 123;
    s.sound = false;
    expect(writeSave(s, storage)).toBe(true);
    expect(readSave(storage)).toEqual(s);
  });
  it("recovers corrupt, unavailable and invalid data", () => {
    expect(readSave({ getItem: () => "{" })).toEqual(defaults());
    expect(
      readSave({
        getItem: () => {
          throw Error();
        },
      }),
    ).toEqual(defaults());
    expect(
      writeSave(defaults(), {
        setItem: () => {
          throw Error();
        },
      }),
    ).toBe(false);
    expect(
      readSave({
        getItem: () =>
          JSON.stringify({
            version: 1,
            highScore: -99,
            unlocked: ["bad"],
            sound: "yes",
          }),
      }),
    ).toEqual(defaults());
  });
});
describe("low frame rate and endgame safety", () => {
  it("fast projectiles cannot tunnel through a small enemy at 20fps", () => {
    const g = new Game("lance");
    g.spawnTimer = 999;
    g.attackTimer = 999;
    const e = g.spawn("hound", 114, 200);
    e.speed = 0;
    g.attack({
      t: 0,
      x: 100,
      y: 200,
      angle: 0,
      weapon: "lance",
      damage: 100,
      size: 1,
      count: 1,
    });
    g.update(0.05, { x: 0, y: 0 });
    expect(e.hp).toBeLessThanOrEqual(0);
  });
  it("summoners stop creating adds when the timed wave ends", () => {
    const g = new Game();
    g.spawnTimer = 999;
    g.attackTimer = 999;
    g.wave = 5;
    g.waveTime = g.waveDuration;
    const e = g.spawn("summoner", 100, 200);
    e.wind = 0.01;
    g.update(0.02, { x: 0, y: 0 });
    expect(g.enemies).toHaveLength(1);
  });
  it("standing still without echoes produces a genuine defeat", () => {
    const g = new Game("bolt", 42);
    for (let i = 0; i < 60 * 300 && g.state !== "lost"; i++) {
      if (g.state === "upgrade") g.choose(g.choices[0].id);
      g.update(1 / 60, { x: 0, y: 0 });
    }
    expect(g.state).toBe("lost");
  });
});

it("does not offer redundant Echo cooldown ranks", () => {
  const g = new Game("bolt", 42);
  g.levels.cooldown = 4;
  for (let i = 0; i < 30; i++) {
    g.between();
    expect(g.choices.some((u) => u.id === "cooldown")).toBe(false);
  }
  expect(g.echoCooldown).toBe(2.6);
});

it("survives a browser that denies the localStorage property itself", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("SecurityError");
    },
  });
  try {
    expect(readSave()).toEqual(defaults());
    expect(writeSave(defaults())).toBe(false);
  } finally {
    Reflect.deleteProperty(globalThis, "localStorage");
  }
});

it("lethal damage cannot trigger both victory and defeat through retaliation", () => {
  const g = new Game();
  const events: string[] = [];
  g.onEvent = (name) => events.push(name);
  g.apply("revenge");
  const boss = g.spawn("boss", g.player.x + 60, g.player.y);
  boss.hp = 1;
  g.damagePlayer(1000, boss);
  expect(g.state).toBe("lost");
  expect(events.filter((name) => name === "won" || name === "lost")).toEqual([
    "lost",
  ]);
});
it.each(["bolt", "blade", "lance"] as Weapon[])(
  "standing still with automatic Echo cannot win with %s",
  (weapon) => {
    const g = new Game(weapon, 42);
    for (
      let i = 0;
      i < 60 * 650 && g.state !== "lost" && g.state !== "won";
      i++
    ) {
      if (g.state === "upgrade") g.choose(g.choices[0].id);
      if (g.ready) g.summon();
      g.update(1 / 60, { x: 0, y: 0 });
    }
    expect(g.state).toBe("lost");
  },
);
