import type { Weapon } from "./game";
export type Save = {
  version: 1;
  highScore: number;
  runs: number;
  wins: number;
  bestWave: number;
  totalEchoes: number;
  unlocked: Weapon[];
  tutorial: boolean;
  sound: boolean;
  shake: boolean;
  quality: "auto" | "low";
};
export const defaults = (): Save => ({
  version: 1,
  highScore: 0,
  runs: 0,
  wins: 0,
  bestWave: 0,
  totalEchoes: 0,
  unlocked: ["bolt"],
  tutorial: false,
  sound: true,
  shake: true,
  quality: "auto",
});
export function readSave(storage?: Pick<Storage, "getItem">): Save {
  try {
    const raw = JSON.parse(
      (storage ?? localStorage).getItem("blackhouse.revenant.v1") || "null",
    );
    if (!raw || raw.version !== 1) return defaults();
    const s = defaults();
    for (const k of [
      "highScore",
      "runs",
      "wins",
      "bestWave",
      "totalEchoes",
    ] as const)
      s[k] = Number.isFinite(raw[k]) ? Math.max(0, Math.floor(raw[k])) : 0;
    for (const k of ["tutorial", "sound", "shake"] as const)
      if (typeof raw[k] === "boolean") s[k] = raw[k];
    s.unlocked = [
      "bolt",
      ...(["blade", "lance"] as Weapon[]).filter(
        (w) => Array.isArray(raw.unlocked) && raw.unlocked.includes(w),
      ),
    ];
    s.quality = raw.quality === "low" ? "low" : "auto";
    return s;
  } catch {
    return defaults();
  }
}
export function writeSave(s: Save, storage?: Pick<Storage, "setItem">) {
  try {
    (storage ?? localStorage).setItem(
      "blackhouse.revenant.v1",
      JSON.stringify(s),
    );
    return true;
  } catch {
    return false;
  }
}
