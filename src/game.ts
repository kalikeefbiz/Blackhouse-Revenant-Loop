export type Weapon = "bolt" | "blade" | "lance";
export type Kind =
  "husk" | "hound" | "archer" | "brute" | "wraith" | "summoner" | "boss";
export type Vec = { x: number; y: number };
export type Attack = Vec & {
  t: number;
  angle: number;
  weapon: Weapon;
  damage: number;
  size: number;
  count: number;
};
export type Frame = Vec & { t: number; angle: number };
export type Enemy = Vec & {
  id: number;
  kind: Kind;
  hp: number;
  max: number;
  r: number;
  speed: number;
  timer: number;
  wind: number;
  angle: number;
  flash: number;
  phase: number;
  vx: number;
  vy: number;
};
export type Shot = Vec & {
  vx: number;
  vy: number;
  life: number;
  damage: number;
  r: number;
  enemy: boolean;
  pierce: number;
  hit: Set<number>;
  color: string;
};
export type FX = Vec & {
  type: "burst" | "sweep" | "ring" | "line";
  life: number;
  max: number;
  color: string;
  r: number;
  angle: number;
};
export type Echo = Vec & {
  age: number;
  frames: Frame[];
  attacks: Attack[];
  index: number;
  angle: number;
};
export const W = 420,
  H = 680;
export const WEAPONS: Record<
  Weapon,
  { name: string; desc: string; damage: number; rate: number; range: number }
> = {
  bolt: {
    name: "Spectral Bolt",
    desc: "Rapid aimed bolts · ranged crossfire",
    damage: 24,
    rate: 0.4,
    range: 440,
  },
  blade: {
    name: "Crescent Blade",
    desc: "Wide sweeping arcs · close combat",
    damage: 44,
    rate: 0.62,
    range: 132,
  },
  lance: {
    name: "Void Lance",
    desc: "Piercing beams · devastating lines",
    damage: 31,
    rate: 0.9,
    range: 500,
  },
};
export const ARENAS = [
  {
    name: "The Ashen Cloister",
    sub: "I · Where the dead remember",
    color: "#668fa0",
    accent: "#70f5df",
  },
  {
    name: "The Violet Ossuary",
    sub: "II · A debt written in bone",
    color: "#9e78be",
    accent: "#d6a3ff",
  },
  {
    name: "The Crimson Eclipse",
    sub: "III · Break the sovereign’s cycle",
    color: "#b57887",
    accent: "#ffb38c",
  },
];
export const UPGRADES = [
  {
    id: "power",
    name: "Hungry Steel",
    desc: "+22% weapon damage.",
    tag: "OFFENSE",
  },
  {
    id: "haste",
    name: "Quickening",
    desc: "Attack 15% faster.",
    tag: "OFFENSE",
  },
  {
    id: "health",
    name: "Graveheart",
    desc: "+25 max health. Restore 35 health.",
    tag: "DEFENSE",
  },
  {
    id: "speed",
    name: "Wraithstep",
    desc: "+12% movement speed.",
    tag: "MOVEMENT",
  },
  {
    id: "echoPower",
    name: "Ancestral Wrath",
    desc: "Echoes deal +25% of your recorded damage.",
    tag: "ECHO",
  },
  {
    id: "cooldown",
    name: "Fractured Hour",
    desc: "Echo cooldown −0.7s (minimum 2.6s).",
    tag: "ECHO",
  },
  {
    id: "size",
    name: "Long Shadow",
    desc: "+20% weapon reach and projectile size.",
    tag: "WEAPON",
  },
  {
    id: "multi",
    name: "Forked Omen",
    desc: "An additional bolt or lance. Wider blade arc damage.",
    tag: "WEAPON",
  },
  {
    id: "armor",
    name: "Obsidian Skin",
    desc: "Reduce incoming damage by 2.",
    tag: "DEFENSE",
  },
  {
    id: "heal",
    name: "Blood Tithe",
    desc: "Every 8 kills restores 4 health.",
    tag: "SUSTAIN",
  },
  {
    id: "nova",
    name: "Arrival Rite",
    desc: "Summoning an Echo blasts nearby enemies.",
    tag: "ECHO",
  },
  {
    id: "frost",
    name: "Winter’s Wake",
    desc: "Your attacks slow enemies briefly.",
    tag: "CONTROL",
  },
  {
    id: "revenge",
    name: "Vengeful Pulse",
    desc: "Taking damage releases a damaging shockwave.",
    tag: "DEFENSE",
  },
  {
    id: "crit",
    name: "Fatal Memory",
    desc: "+15% chance to deal double attack damage.",
    tag: "OFFENSE",
  },
  {
    id: "rest",
    name: "Second Breath",
    desc: "Restore 45 health. +8 max health.",
    tag: "RECOVERY",
  },
] as const;
export type UpgradeId = (typeof UPGRADES)[number]["id"];
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export function segmentDistance(p: Vec, a: Vec, b: Vec) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = Math.max(
      0,
      Math.min(
        1,
        ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
      ),
    );
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export class RNG {
  constructor(public seed = Date.now() >>> 0) {}
  next() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  pick<T>(xs: readonly T[]) {
    return xs[Math.floor(this.next() * xs.length)];
  }
}
export class Recorder {
  frames: Frame[] = [];
  attacks: Attack[] = [];
  record(frame: Frame) {
    this.frames.push({ ...frame });
    const cut = frame.t - 5;
    while (this.frames.length > 1 && this.frames[1].t < cut)
      this.frames.shift();
    while (this.attacks.length && this.attacks[0].t < cut) this.attacks.shift();
  }
  attack(a: Attack) {
    this.attacks.push({ ...a });
  }
  snapshot(now: number): Echo | null {
    if (!this.frames.length || now - this.frames[0].t < 4.9) return null;
    const start = now - 5;
    const frames = this.frames.map((f) => ({
      ...f,
      t: Math.max(0, f.t - start),
    }));
    return {
      x: frames[0].x,
      y: frames[0].y,
      angle: frames[0].angle,
      age: 0,
      frames,
      attacks: this.attacks
        .filter((a) => a.t >= start)
        .map((a) => ({ ...a, t: a.t - start })),
      index: 0,
    };
  }
  clear() {
    this.frames = [];
    this.attacks = [];
  }
}
export class Game {
  rng: RNG;
  state: "playing" | "upgrade" | "won" | "lost" = "playing";
  weapon: Weapon;
  player = {
    x: W / 2,
    y: H / 2,
    hp: 100,
    max: 100,
    r: 11,
    angle: -Math.PI / 2,
    inv: 0,
    vx: 0,
    vy: 0,
  };
  time = 0;
  waveTime = 0;
  wave = 1;
  kills = 0;
  score = 0;
  echoKills = 0;
  echoUses = 0;
  cooldown = 0;
  attackTimer = 0;
  spawnTimer = 1;
  nextId = 1;
  bossSpawned = false;
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  fx: FX[] = [];
  echoes: Echo[] = [];
  recorder = new Recorder();
  levels: Partial<Record<UpgradeId, number>> = {};
  choices: (typeof UPGRADES)[number][] = [];
  onEvent: (name: string) => void = () => {};
  frozen = new Map<number, number>();
  constructor(weapon: Weapon = "bolt", seed?: number) {
    this.weapon = weapon;
    this.rng = new RNG(seed);
  }
  level(id: UpgradeId) {
    return this.levels[id] || 0;
  }
  get arena() {
    return Math.min(2, Math.floor((this.wave - 1) / 3));
  }
  get damage() {
    return WEAPONS[this.weapon].damage * (1 + 0.22 * this.level("power"));
  }
  get speed() {
    return 140 * (1 + 0.12 * this.level("speed"));
  }
  get echoCooldown() {
    return Math.max(2.6, 5.2 - 0.7 * this.level("cooldown"));
  }
  get waveDuration() {
    return 44 + (this.wave % 3) * 2;
  }
  get ready() {
    return (
      this.cooldown <= 0 &&
      this.recorder.frames.length > 0 &&
      this.time - this.recorder.frames[0].t >= 4.9
    );
  }
  summon() {
    if (this.state !== "playing" || !this.ready || this.echoes.length >= 2)
      return false;
    const e = this.recorder.snapshot(this.time);
    if (!e) return false;
    this.echoes.push(e);
    this.cooldown = this.echoCooldown;
    this.echoUses++;
    this.onEvent("echo");
    this.effect(this.player, "ring", "#83fff5", 85);
    if (this.level("nova"))
      this.blast(this.player, 110, 35 * this.level("nova"));
    return true;
  }
  effect(p: Vec, type: FX["type"], color: string, r: number, angle = 0) {
    this.fx.push({ ...p, type, color, r, angle, life: 0.35, max: 0.35 });
  }
  blast(p: Vec, r: number, damage: number) {
    this.effect(p, "ring", "#be93ff", r);
    for (const e of this.enemies)
      if (dist(p, e) < r + e.r) this.hurt(e, damage, false);
  }
  spawn(kind: Kind, x?: number, y?: number) {
    const side = Math.floor(this.rng.next() * 4),
      v = this.rng.next();
    const pos =
      x !== undefined
        ? { x, y: y! }
        : {
            x: side % 2 === 0 ? (side === 0 ? 24 : W - 24) : 30 + v * (W - 60),
            y:
              side % 2 === 1
                ? side === 1
                  ? 90
                  : H - 100
                : 100 + v * (H - 200),
          };
    const cfg: Record<Kind, number[]> = {
      husk: [34, 12, 44],
      hound: [25, 10, 75],
      archer: [32, 12, 30],
      brute: [130, 20, 26],
      wraith: [40, 12, 57],
      summoner: [78, 15, 23],
      boss: [2300, 32, 23],
    };
    const [hp, r, speed] = cfg[kind];
    const max = hp * (kind === "boss" ? 1 : 1 + (this.wave - 1) * 0.11);
    const e: Enemy = {
      ...pos,
      id: this.nextId++,
      kind,
      hp: max,
      max,
      r,
      speed,
      timer: 1.2 + this.rng.next(),
      wind: 0,
      angle: 0,
      flash: 0,
      phase: 1,
      vx: 0,
      vy: 0,
    };
    this.enemies.push(e);
    this.effect(e, "ring", kind === "boss" ? "#ff8b94" : "#bc7bff", r + 10);
    return e;
  }
  attack(a: Attack, echo = false) {
    const mult = echo ? 0.65 + 0.25 * this.level("echoPower") : 1;
    const damage = a.damage * mult;
    this.effect(
      a,
      a.weapon === "blade" ? "sweep" : "burst",
      echo ? "#8ef9fa" : a.weapon === "lance" ? "#d5b2ff" : "#eaffdf",
      a.weapon === "blade" ? a.size * 115 : 15,
      a.angle,
    );
    if (a.weapon === "blade") {
      for (const e of this.enemies) {
        const angle = Math.atan2(e.y - a.y, e.x - a.x);
        const d = Math.atan2(
          Math.sin(angle - a.angle),
          Math.cos(angle - a.angle),
        );
        if (
          dist(a, e) < 120 * a.size + e.r &&
          Math.abs(d) < 1.35 + 0.12 * a.count
        )
          this.hurt(e, damage * (1 + 0.15 * (a.count - 1)), echo);
      }
    } else
      for (let i = 0; i < a.count; i++) {
        const angle = a.angle + (i - (a.count - 1) / 2) * 0.16;
        const speed = a.weapon === "lance" ? 520 : 330;
        this.shots.push({
          x: a.x,
          y: a.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.4,
          damage,
          r: (a.weapon === "lance" ? 5 : 4) * a.size,
          enemy: false,
          pierce: a.weapon === "lance" ? 99 : 1,
          hit: new Set(),
          color: echo
            ? "#63f8ef"
            : a.weapon === "lance"
              ? "#c593ff"
              : "#e9f6bd",
        });
        (this.shots.at(-1) as Shot & { echo?: boolean }).echo = echo;
      }
    if (!echo) this.onEvent(a.weapon);
  }
  hurt(e: Enemy, damage: number, echo: boolean) {
    if (e.hp <= 0) return;
    e.hp -= damage;
    e.flash = 0.13;
    if (this.level("frost"))
      this.frozen.set(e.id, 0.6 + 0.2 * this.level("frost"));
    const d = Math.max(1, dist(e, this.player));
    e.vx += ((e.x - this.player.x) / d) * 45;
    e.vy += ((e.y - this.player.y) / d) * 45;
    if (e.hp <= 0) {
      this.kills++;
      if (echo) this.echoKills++;
      this.score += e.kind === "boss" ? 5000 : e.kind === "brute" ? 80 : 30;
      this.effect(e, "burst", echo ? "#76fff2" : "#ed9abb", e.r * 1.8);
      this.onEvent("kill");
      if (this.level("heal") && this.kills % 8 === 0)
        this.player.hp = Math.min(
          this.player.max,
          this.player.hp + 4 * this.level("heal"),
        );
      if (e.kind === "boss") {
        this.state = "won";
        this.onEvent("won");
      }
    }
  }
  damagePlayer(damage: number, source: Vec) {
    if (this.player.inv > 0 || this.state !== "playing") return;
    this.player.hp -= Math.max(1, damage - 2 * this.level("armor"));
    this.player.inv = 0.75;
    const d = Math.max(1, dist(source, this.player));
    this.player.vx = ((this.player.x - source.x) / d) * 170;
    this.player.vy = ((this.player.y - source.y) / d) * 170;
    this.onEvent("hurt");
    this.effect(this.player, "ring", "#ff607e", 35);
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.state = "lost";
      this.onEvent("lost");
      return;
    }
    if (this.level("revenge"))
      this.blast(this.player, 120, 30 * this.level("revenge"));
  }
  enemyShot(e: Vec, angle: number, speed = 120, damage = 12) {
    this.shots.push({
      ...e,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 5,
      damage,
      r: 6,
      enemy: true,
      pierce: 1,
      hit: new Set(),
      color: "#ff6f99",
    });
  }
  update(dt: number, input: Vec) {
    if (this.state !== "playing") return;
    dt = Math.min(0.05, Math.max(0, dt));
    this.time += dt;
    this.waveTime += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.player.inv = Math.max(0, this.player.inv - dt);
    const len = Math.max(1, Math.hypot(input.x, input.y));
    this.player.x = clamp(
      this.player.x + ((input.x / len) * this.speed + this.player.vx) * dt,
      20,
      W - 20,
    );
    this.player.y = clamp(
      this.player.y + ((input.y / len) * this.speed + this.player.vy) * dt,
      92,
      H - 94,
    );
    this.player.vx *= Math.exp(-dt * 9);
    this.player.vy *= Math.exp(-dt * 9);
    const target = this.enemies
      .filter((e) => e.hp > 0)
      .sort((a, b) => dist(a, this.player) - dist(b, this.player))[0];
    this.attackTimer -= dt;
    if (target) {
      this.player.angle = Math.atan2(
        target.y - this.player.y,
        target.x - this.player.x,
      );
      if (
        this.attackTimer <= 0 &&
        dist(target, this.player) <
          WEAPONS[this.weapon].range * (1 + 0.2 * this.level("size"))
      ) {
        const a: Attack = {
          ...this.player,
          t: this.time,
          angle: this.player.angle,
          weapon: this.weapon,
          damage:
            this.damage * (this.rng.next() < 0.15 * this.level("crit") ? 2 : 1),
          size: 1 + 0.2 * this.level("size"),
          count: 1 + Math.min(3, this.level("multi")),
        };
        this.attack(a);
        this.recorder.attack(a);
        this.attackTimer =
          WEAPONS[this.weapon].rate / Math.pow(1.15, this.level("haste"));
      }
    }
    this.recorder.record({
      x: this.player.x,
      y: this.player.y,
      t: this.time,
      angle: this.player.angle,
    });
    for (const e of this.echoes) {
      e.age += dt;
      while (e.index < e.attacks.length && e.attacks[e.index].t <= e.age)
        this.attack(e.attacks[e.index++], true);
      let i = 0;
      while (i < e.frames.length - 2 && e.frames[i + 1].t < e.age) i++;
      const a = e.frames[i],
        b = e.frames[Math.min(i + 1, e.frames.length - 1)],
        t = clamp((e.age - a.t) / (b.t - a.t || 1), 0, 1);
      e.x = a.x + (b.x - a.x) * t;
      e.y = a.y + (b.y - a.y) * t;
      e.angle = a.angle;
    }
    this.echoes = this.echoes.filter((e) => e.age < 5);
    if (this.wave < 10) {
      this.spawnTimer -= dt;
      if (
        this.spawnTimer <= 0 &&
        this.waveTime < this.waveDuration - 5 &&
        this.enemies.length < 30
      ) {
        const pool: Kind[] = ["husk", "hound"];
        if (this.wave >= 2) pool.push("archer");
        if (this.wave >= 3) pool.push("brute");
        if (this.wave >= 4) pool.push("wraith");
        if (this.wave >= 5) pool.push("summoner");
        this.spawn(this.rng.pick(pool));
        this.spawnTimer = Math.max(0.6, 1.65 - this.wave * 0.1);
      }
      if (
        this.waveTime >= this.waveDuration &&
        this.enemies.every((e) => e.hp <= 0)
      )
        this.between();
    } else if (!this.bossSpawned) {
      this.spawn("boss", W / 2, 160);
      this.bossSpawned = true;
      this.onEvent("boss");
    }
    for (const e of [...this.enemies]) {
      if (e.hp <= 0) continue;
      e.flash = Math.max(0, e.flash - dt);
      const slowed = this.frozen.get(e.id) || 0;
      this.frozen.set(e.id, Math.max(0, slowed - dt));
      let target: Vec = this.player;
      for (const ghost of this.echoes)
        if (dist(e, ghost) < dist(e, target) * 0.72) target = ghost;
      const d = dist(e, target),
        angle = Math.atan2(target.y - e.y, target.x - e.x);
      e.timer -= dt;
      if (e.wind > 0) {
        e.wind -= dt;
        if (e.wind <= 0) {
          if (e.kind === "hound") {
            e.vx = Math.cos(e.angle) * 340;
            e.vy = Math.sin(e.angle) * 340;
          } else if (e.kind === "brute") {
            this.effect(e, "ring", "#ff957e", 65);
            if (dist(e, this.player) < 77) this.damagePlayer(22, e);
          } else if (e.kind === "archer") this.enemyShot(e, e.angle, 150);
          else if (e.kind === "summoner") {
            if (
              this.enemies.length < 24 &&
              this.waveTime < this.waveDuration - 5
            ) {
              this.spawn(
                "husk",
                clamp(e.x + 20, 22, W - 22),
                clamp(e.y + 20, 95, H - 100),
              );
              this.spawn("hound", clamp(e.x - 20, 22, W - 22), e.y);
            }
          } else if (e.kind === "boss") {
            const n = 8 + e.phase * 4;
            for (let i = 0; i < n; i++)
              this.enemyShot(
                e,
                (i * Math.PI * 2) / n + this.time * 0.3,
                90 + e.phase * 12,
                15,
              );
            for (let i = -1; i <= 1; i++)
              this.enemyShot(e, e.angle + i * 0.22, 180, 18);
            this.effect(e, "ring", "#ff8ca5", 90);
            if (e.phase >= 2 && this.enemies.length < 14)
              this.spawn(this.rng.pick(["hound", "wraith"] as const));
          }
        }
      } else {
        let move = 1;
        if (e.kind === "archer") move = d < 160 ? -0.5 : d < 220 ? 0 : 1;
        if (e.kind === "summoner")
          move =
            this.waveTime >= this.waveDuration - 5 ? 1 : d < 150 ? -0.3 : 0.4;
        if (this.wave < 10 && this.waveTime >= this.waveDuration) move = 1;
        if (e.kind === "boss") move = d < 130 ? -0.3 : 0.7;
        if (e.kind === "brute" && d < 60) move = 0;
        e.x += Math.cos(angle) * e.speed * move * dt * (slowed > 0 ? 0.55 : 1);
        e.y += Math.sin(angle) * e.speed * move * dt * (slowed > 0 ? 0.55 : 1);
        if (e.kind === "wraith") {
          e.x += Math.cos(this.time * 3 + e.id) * 40 * dt;
          e.y += Math.sin(this.time * 3 + e.id) * 40 * dt;
        }
        if (e.timer <= 0 && e.kind !== "husk" && e.kind !== "wraith") {
          if (e.kind !== "brute" || d < 95) {
            e.wind = e.kind === "boss" ? 1.1 : e.kind === "brute" ? 0.8 : 0.65;
            e.angle = angle;
            e.timer =
              e.kind === "summoner"
                ? 5
                : e.kind === "boss"
                  ? 3.1 - e.phase * 0.3
                  : 2.6;
            this.onEvent("tell");
          }
        }
      }
      if (e.kind === "boss") {
        const phase = e.hp / e.max < 0.33 ? 3 : e.hp / e.max < 0.66 ? 2 : 1;
        if (phase !== e.phase) {
          e.phase = phase;
          this.onEvent("phase");
          this.effect(e, "ring", "#ffcee8", 170);
        }
      }
      e.x = clamp(e.x + e.vx * dt, 16, W - 16);
      e.y = clamp(e.y + e.vy * dt, 86, H - 86);
      e.vx *= Math.exp(-dt * (e.kind === "hound" ? 3 : 8));
      e.vy *= Math.exp(-dt * (e.kind === "hound" ? 3 : 8));
      if (dist(e, this.player) < e.r + this.player.r)
        this.damagePlayer(
          e.kind === "boss" ? 25 : e.kind === "brute" ? 19 : 10,
          e,
        );
    }
    // Soft separation prevents an unreadable stack of bodies.
    for (let i = 0; i < this.enemies.length; i++)
      for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i],
          b = this.enemies[j],
          d = dist(a, b),
          min = (a.r + b.r) * 0.8;
        if (d > 0 && d < min) {
          const push = (min - d) * dt * 2;
          a.x += ((a.x - b.x) / d) * push;
          a.y += ((a.y - b.y) / d) * push;
          b.x -= ((a.x - b.x) / d) * push;
          b.y -= ((a.y - b.y) / d) * push;
        }
      }
    for (const s of this.shots) {
      const previous = { x: s.x, y: s.y };
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.enemy) {
        if (segmentDistance(this.player, previous, s) < s.r + this.player.r) {
          this.damagePlayer(s.damage, s);
          s.life = 0;
        }
      } else
        for (const e of this.enemies)
          if (
            e.hp > 0 &&
            !s.hit.has(e.id) &&
            segmentDistance(e, previous, s) < s.r + e.r
          ) {
            this.hurt(e, s.damage, !!(s as Shot & { echo?: boolean }).echo);
            s.hit.add(e.id);
            if (--s.pierce <= 0) {
              s.life = 0;
              break;
            }
          }
    }
    this.shots = this.shots.filter(
      (s) => s.life > 0 && s.x > -30 && s.x < W + 30 && s.y > 50 && s.y < H,
    );
    this.enemies = this.enemies.filter((e) => {
      if (e.hp <= 0) {
        this.frozen.delete(e.id);
        return false;
      }
      return true;
    });
    for (const f of this.fx) f.life -= dt;
    this.fx = this.fx.filter((f) => f.life > 0).slice(-100);
  }
  between() {
    this.state = "upgrade";
    this.shots = [];
    this.echoes = [];
    this.recorder.clear();
    const pool = [...UPGRADES].filter(
      (u) =>
        this.level(u.id) < (u.id === "multi" ? 3 : u.id === "cooldown" ? 4 : 5),
    );
    this.choices = [];
    while (this.choices.length < 3 && pool.length) {
      const i = Math.floor(this.rng.next() * pool.length);
      this.choices.push(pool.splice(i, 1)[0]);
    }
    this.onEvent("upgrade");
  }
  choose(id: UpgradeId) {
    if (this.state !== "upgrade" || !this.choices.some((u) => u.id === id))
      return false;
    this.apply(id);
    this.wave++;
    this.waveTime = 0;
    this.spawnTimer = 1.5;
    this.player.hp = Math.min(this.player.max, this.player.hp + 12);
    this.player.inv = 1;
    this.cooldown = 0;
    this.state = "playing";
    this.onEvent("wave");
    return true;
  }
  apply(id: UpgradeId) {
    this.levels[id] = this.level(id) + 1;
    if (id === "health") {
      this.player.max += 25;
      this.player.hp = Math.min(this.player.max, this.player.hp + 35);
    }
    if (id === "rest") {
      this.player.max += 8;
      this.player.hp = Math.min(this.player.max, this.player.hp + 45);
    }
  }
}
