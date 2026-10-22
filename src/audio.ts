export class Sound {
  ctx: AudioContext | null = null;
  enabled = true;
  master: GainNode | null = null;
  drone: OscillatorNode | null = null;
  lastPlayed = new Map<string, number>();
  unlock() {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? 0.16 : 0;
        this.master.connect(this.ctx.destination);
        this.drone = this.ctx.createOscillator();
        this.drone.type = "sine";
        this.drone.frequency.value = 55;
        const g = this.ctx.createGain();
        g.gain.value = 0.12;
        this.drone.connect(g);
        g.connect(this.master);
        this.drone.start();
      }
      void this.ctx.resume().catch(() => {});
    } catch {
      /* Silent mode remains playable. */
    }
  }
  set(value: boolean) {
    this.enabled = value;
    if (this.ctx && this.master)
      this.master.gain.setTargetAtTime(
        value ? 0.16 : 0,
        this.ctx.currentTime,
        0.08,
      );
  }
  suspend() {
    void this.ctx?.suspend().catch(() => {});
  }
  play(name: string) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    if (now - (this.lastPlayed.get(name) ?? -1) < 0.045) return;
    this.lastPlayed.set(name, now);
    const map: Record<string, number[]> = {
      bolt: [580, 220, 0.09],
      blade: [150, 65, 0.16],
      lance: [220, 880, 0.14],
      echo: [180, 720, 0.5],
      hurt: [110, 40, 0.2],
      kill: [280, 80, 0.08],
      tell: [160, 190, 0.08],
      upgrade: [330, 660, 0.4],
      wave: [220, 440, 0.4],
      boss: [75, 40, 1],
      phase: [90, 60, 0.8],
      won: [440, 880, 1],
      lost: [180, 35, 1],
    };
    const [f, end, d] = map[name] || [440, 220, 0.1];
    const t = this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = ["hurt", "blade", "boss"].includes(name) ? "sawtooth" : "sine";
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(end, t + d);
    g.gain.setValueAtTime(
      name === "tell" ? 0.2 : name === "kill" ? 0.14 : 0.3,
      t,
    );
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + d);
  }
}
