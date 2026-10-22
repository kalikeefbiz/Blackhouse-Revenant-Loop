import { Game, W, H, ARENAS, type Vec, type Enemy } from "./game";
export class Renderer {
  ctx: CanvasRenderingContext2D;
  low = false;
  shake = 0;
  background = document.createElement("canvas");
  backgroundArena = -1;
  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.resize();
  }
  resize() {
    this.backgroundArena = -1;
    const d = Math.min(devicePixelRatio || 1, this.low ? 1 : 2);
    this.canvas.width = W * d;
    this.canvas.height = H * d;
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  circle(p: Vec, r: number, color: string, fill = true) {
    const c = this.ctx;
    c.beginPath();
    c.arc(p.x, p.y, r, 0, Math.PI * 2);
    if (fill) {
      c.fillStyle = color;
      c.fill();
    } else {
      c.strokeStyle = color;
      c.stroke();
    }
  }
  line(x: number, y: number, x2: number, y2: number, color: string, width = 1) {
    const c = this.ctx;
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x2, y2);
    c.stroke();
  }
  draw(g: Game | null, t: number) {
    const c = this.ctx,
      a = ARENAS[g?.arena || 0];
    c.save();
    c.fillStyle = "#080b17";
    c.fillRect(0, 0, W, H);
    if (this.shake > 0) {
      c.translate(
        Math.sin(t * 100) * this.shake,
        Math.cos(t * 130) * this.shake,
      );
      this.shake *= 0.86;
    }
    if (this.backgroundArena !== (g?.arena || 0)) {
      this.background.width = this.canvas.width;
      this.background.height = this.canvas.height;
      this.ctx = this.background.getContext("2d", { alpha: false })!;
      const d = this.canvas.width / W;
      this.ctx.setTransform(d, 0, 0, d, 0, 0);
      this.drawArena(g?.arena || 0);
      this.ctx = c;
      this.backgroundArena = g?.arena || 0;
    }
    c.drawImage(this.background, 0, 0, W, H);
    if (!g) {
      this.actor({ x: W / 2, y: H / 2 }, -Math.PI / 2, t, false);
      c.restore();
      return;
    }
    // Recorded route makes the tactical geometry visible.
    if (g.recorder.frames.length > 1) {
      c.strokeStyle = "#74cabe";
      c.globalAlpha = 0.12;
      c.lineWidth = 2;
      c.beginPath();
      g.recorder.frames.forEach((f, i) =>
        i ? c.lineTo(f.x, f.y) : c.moveTo(f.x, f.y),
      );
      c.stroke();
      c.globalAlpha = 1;
    }
    for (const e of g.enemies)
      if (e.wind > 0) {
        c.globalAlpha = 0.35 + 0.2 * Math.sin(t * 18);
        if (e.kind === "brute" || e.kind === "boss") {
          this.circle(e, e.kind === "boss" ? 80 : 65, "#ff698c", false);
          if (e.kind === "brute") {
            c.globalAlpha = 0.1;
            this.circle(e, 65, "#ff698c");
          }
        } else if (e.kind === "hound" || e.kind === "archer")
          this.line(
            e.x,
            e.y,
            e.x + Math.cos(e.angle) * 160,
            e.y + Math.sin(e.angle) * 160,
            "#ff7096",
            3,
          );
        else this.circle(e, 35, "#dca4ff", false);
        c.globalAlpha = 1;
      }
    for (const e of g.echoes) {
      c.globalAlpha = Math.min(1, (5 - e.age) * 2) * 0.65;
      this.actor(e, e.angle, t, true);
      c.globalAlpha = 0.85;
      c.fillStyle = "#a6ffef";
      c.font = "9px system-ui";
      c.textAlign = "center";
      c.fillText((5 - e.age).toFixed(1) + "s", e.x, e.y - 31);
      c.globalAlpha = 1;
    }
    for (const e of [...g.enemies].sort((a, b) => a.y - b.y)) this.enemy(e, t);
    c.globalAlpha = g.player.inv > 0 && Math.sin(t * 45) > 0 ? 0.4 : 1;
    this.actor(g.player, g.player.angle, t, false);
    c.globalAlpha = 1;
    for (const s of g.shots) {
      this.line(
        s.x - s.vx * 0.026,
        s.y - s.vy * 0.026,
        s.x,
        s.y,
        s.color,
        s.r * 1.5,
      );
      this.circle(s, s.r, s.enemy ? "#ffb7cd" : "#efffff");
    }
    for (const f of g.fx) {
      const p = 1 - f.life / f.max;
      c.globalAlpha = 1 - p;
      c.lineWidth = 2;
      if (f.type === "ring") this.circle(f, f.r * p, f.color, false);
      else if (f.type === "sweep") {
        c.save();
        c.translate(f.x, f.y);
        c.rotate(f.angle);
        c.strokeStyle = f.color;
        c.lineWidth = 12 * (1 - p) + 1;
        c.beginPath();
        c.arc(0, 0, f.r * (0.6 + p * 0.4), -1.2 + p * 0.5, 1.2 + p * 0.5);
        c.stroke();
        c.restore();
      } else {
        for (let i = 0; i < (this.low ? 4 : 8); i++) {
          const q = (i * Math.PI) / 4 + f.angle;
          this.circle(
            { x: f.x + Math.cos(q) * f.r * p, y: f.y + Math.sin(q) * f.r * p },
            3 * (1 - p),
            f.color,
          );
        }
      }
      c.globalAlpha = 1;
    }
    if (!this.low) {
      c.globalAlpha = 0.3;
      for (let i = 0; i < 22; i++)
        this.circle(
          {
            x: (i * 67 + Math.sin(t + i) * 12) % W,
            y: 85 + ((i * 37 - t * (3 + (i % 3))) % (H - 170)),
          },
          i % 3 === 0 ? 1.5 : 0.8,
          a.accent,
        );
      c.globalAlpha = 1;
    }
    c.restore();
  }
  drawArena(arena: number) {
    const c = this.ctx,
      a = ARENAS[arena];
    const bg = c.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 400);
    bg.addColorStop(
      0,
      arena === 2 ? "#301923" : arena === 1 ? "#231c36" : "#182934",
    );
    bg.addColorStop(1, "#080b17");
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);
    // Hand-drawn procedural masonry, sigils and chapter architecture.
    c.globalAlpha = 0.22;
    for (let y = 88; y < H - 70; y += 38) {
      for (let x = -38; x < W; x += 76) {
        const off = (Math.floor(y / 38) % 2) * 38;
        c.strokeStyle = a.color;
        c.strokeRect(x + off, y, 74, 36);
      }
    }
    c.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {
      c.lineWidth = i === 0 ? 2 : 1;
      c.globalAlpha = 0.15;
      this.circle({ x: W / 2, y: H / 2 }, 95 + i * 52, a.accent, false);
    }
    c.globalAlpha = 0.22;
    for (let i = 0; i < 12; i++) {
      const q = (i * Math.PI) / 6;
      const x = W / 2 + Math.cos(q) * 177,
        y = H / 2 + Math.sin(q) * 177;
      c.save();
      c.translate(x, y);
      c.rotate(q);
      c.strokeStyle = a.accent;
      c.strokeRect(-4, -7, 8, 14);
      this.line(-8, 0, 8, 0, a.accent);
      c.restore();
    }
    c.globalAlpha = 0.12;
    for (let i = 0; i < 6; i++) {
      const q = (i * Math.PI) / 3;
      this.line(
        W / 2 + Math.cos(q) * 147,
        H / 2 + Math.sin(q) * 147,
        W / 2 + Math.cos(q + (Math.PI * 2) / 3) * 147,
        H / 2 + Math.sin(q + (Math.PI * 2) / 3) * 147,
        a.accent,
      );
    }
    c.globalAlpha = 1;
    for (const x of [16, W - 16])
      for (const y of [115, 230, 450, 565]) {
        c.fillStyle = "#0a101c";
        c.fillRect(x - 10, y - 22, 20, 44);
        c.strokeStyle = a.color;
        c.strokeRect(x - 10, y - 22, 20, 44);
        this.circle({ x, y: y - 22 }, 3, a.accent);
        if (!this.low) {
          const glow = c.createRadialGradient(x, y - 22, 1, x, y - 22, 24);
          glow.addColorStop(0, a.accent + "50");
          glow.addColorStop(1, a.accent + "00");
          c.fillStyle = glow;
          c.fillRect(x - 24, y - 46, 48, 48);
        }
      }
    if (arena === 1) {
      for (const x of [40, W - 40])
        for (let y = 160; y < 540; y += 75) {
          this.circle({ x, y }, 8, "#9d86ab");
          this.circle({ x: x - 3, y: y - 1 }, 2, "#171521");
          this.circle({ x: x + 3, y: y - 1 }, 2, "#171521");
        }
    }
    if (arena === 2) {
      c.globalAlpha = 0.22;
      this.circle({ x: W / 2, y: 145 }, 43, "#f57385");
      this.circle({ x: W / 2 + 14, y: 137 }, 39, "#080b17");
      c.globalAlpha = 1;
    }
    c.strokeStyle = a.color + "66";
    c.strokeRect(29, 84, W - 58, H - 168);
  }
  actor(p: Vec, angle: number, t: number, ghost: boolean) {
    const c = this.ctx,
      bob = Math.sin(t * 7) * 1.2;
    c.save();
    c.translate(p.x, p.y + bob);
    c.fillStyle = "#00000060";
    c.beginPath();
    c.ellipse(0, 12, 15, 6, 0, 0, Math.PI * 2);
    c.fill();
    const edge = ghost ? "#65fff1" : "#e9e3cf";
    c.fillStyle = ghost ? "#286b78" : "#161b2f";
    c.strokeStyle = ghost ? "#69e8ed" : "#847c96";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(-8, -12);
    c.lineTo(8, -12);
    c.lineTo(14, 16);
    c.lineTo(4, 12);
    c.lineTo(0, 19);
    c.lineTo(-13, 15);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = ghost ? "#3d91a0" : "#38384d";
    c.beginPath();
    c.moveTo(0, -22);
    c.lineTo(10, -9);
    c.lineTo(6, 0);
    c.lineTo(-7, 0);
    c.lineTo(-10, -9);
    c.closePath();
    c.fill();
    c.fillStyle = "#080d19";
    c.fillRect(-6, -11, 12, 7);
    this.line(-4, -8, -1, -8, edge, 2);
    this.line(2, -8, 5, -8, edge, 2);
    this.line(-3, 2, 3, 10, edge, 1);
    const x = Math.cos(angle) * 18,
      y = Math.sin(angle) * 18;
    this.line(x * 0.6, y * 0.6, x * 1.4, y * 1.4, edge, 3);
    this.circle({ x, y }, 3, ghost ? "#95fff1" : "#d8b8ff");
    c.restore();
  }
  enemy(e: Enemy, t: number) {
    const c = this.ctx;
    c.save();
    c.translate(e.x, e.y);
    const color =
      e.flash > 0
        ? "#ffffff"
        : e.kind === "boss"
          ? "#d78b9f"
          : e.kind === "wraith"
            ? "#a58bea"
            : e.kind === "archer"
              ? "#d5a080"
              : e.kind === "summoner"
                ? "#bc90d7"
                : e.kind === "brute"
                  ? "#b1a5a0"
                  : "#ad7d91";
    c.fillStyle = "#00000050";
    c.beginPath();
    c.ellipse(0, e.r * 0.7, e.r, 6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle =
      e.flash > 0 ? "#fff" : e.kind === "wraith" ? "#41365e" : "#342735";
    c.strokeStyle = color;
    c.lineWidth = 1.5;
    if (e.kind === "hound") {
      c.rotate(e.angle || Math.atan2(e.vy, e.vx));
      c.beginPath();
      c.moveTo(15, 0);
      c.lineTo(4, -9);
      c.lineTo(-12, -6);
      c.lineTo(-6, 0);
      c.lineTo(-12, 7);
      c.lineTo(4, 8);
      c.closePath();
      c.fill();
      c.stroke();
      this.circle({ x: 8, y: -3 }, 2, "#ff7893");
    } else {
      const r = e.r;
      c.beginPath();
      c.moveTo(-r * 0.6, -r * 0.6);
      c.lineTo(0, -r * 1.3);
      c.lineTo(r * 0.7, -r * 0.6);
      c.lineTo(r, r * 0.8);
      c.lineTo(0, r * 0.5 + Math.sin(t * 4 + e.id) * 3);
      c.lineTo(-r, r * 0.8);
      c.closePath();
      c.fill();
      c.stroke();
      if (e.kind === "brute") {
        c.strokeRect(-r, -r * 0.3, r * 2, r);
        this.line(-r - 4, -r, r + 4, r * 0.8, color, 4);
      }
      if (e.kind === "boss") {
        c.beginPath();
        c.moveTo(-22, -29);
        c.lineTo(-28, -45);
        c.lineTo(-8, -33);
        c.lineTo(0, -49);
        c.lineTo(9, -33);
        c.lineTo(28, -45);
        c.lineTo(22, -29);
        c.stroke();
        this.circle({ x: 0, y: 4 }, 8, "#ff7f9e", false);
      }
      if (e.kind === "archer") {
        c.beginPath();
        c.arc(15, 0, 14, -1.5, 1.5);
        c.stroke();
        this.line(16, -14, 16, 14, color);
      }
      if (e.kind === "summoner") {
        this.line(19, -25, 19, 15, color, 3);
        this.circle({ x: 19, y: -25 }, 5, "#dcb1ff", false);
      }
      this.line(-5, -e.r * 0.5, 5, -e.r * 0.5, "#ff8aa7", 3);
    }
    if (e.hp < e.max && e.kind !== "boss") {
      c.fillStyle = "#14131f";
      c.fillRect(-14, -e.r - 10, 28, 3);
      c.fillStyle = color;
      c.fillRect(-14, -e.r - 10, (28 * e.hp) / e.max, 3);
    }
    c.restore();
  }
}
