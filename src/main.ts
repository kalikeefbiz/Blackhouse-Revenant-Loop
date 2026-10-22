import "./style.css";
import { Game, W, H, WEAPONS, ARENAS, type Weapon } from "./game";
import { Renderer } from "./render";
import { Sound } from "./audio";
import { readSave, writeSave } from "./save";
const $ = <T extends HTMLElement>(q: string) => document.querySelector<T>(q)!;
const canvas = $<HTMLCanvasElement>("#world"),
  overlay = $("#overlay"),
  hud = $("#hud"),
  controls = $("#controls"),
  echo = $<HTMLButtonElement>("#echo"),
  stick = $("#stick"),
  knob = $("#stick i"),
  toast = $("#toast");
const renderer = new Renderer(canvas),
  sound = new Sound();
let save = readSave(),
  game: Game | null = null,
  selected: Weapon = "bolt",
  paused = false,
  screen = "menu",
  tutorial = 0,
  tutorialMove = 0,
  toastTimer = 0,
  last = performance.now(),
  hudTimer = 0,
  slowFrames = 0;
sound.set(save.sound);
renderer.low = save.quality === "low";
renderer.resize();
let move = { x: 0, y: 0 },
  stickId: number | null = null;
const keys = new Set<string>();
function persist() {
  if (!writeSave(save))
    notify("Storage unavailable — progress lasts this session.");
}
function notify(text: string) {
  toast.textContent = text;
  toast.classList.add("show");
  toastTimer = 3;
}
function panel(html: string) {
  overlay.innerHTML = `<section class="panel">${html}</section>`;
}
function bind(id: string, fn: () => void) {
  document.getElementById(id)?.addEventListener("click", () => {
    sound.unlock();
    fn();
  });
}
function resetInput() {
  keys.clear();
  move = { x: 0, y: 0 };
  stickId = null;
  knob.style.transform = "";
}
function clearToast() {
  toastTimer = 0;
  toast.classList.remove("show");
}
function menu() {
  clearToast();
  game = null;
  paused = false;
  screen = "menu";
  tutorial = 0;
  resetInput();
  hud.hidden = true;
  controls.hidden = true;
  panel(
    `<div class="brand">BLACK<b>HOUSE</b></div><div class="eyebrow">An occult survival roguelite</div><h1>REVENANT<br><em>LOOP</em></h1><p class="tagline">Every five seconds,<br>your past becomes your ally.</p><div class="sigil" aria-hidden="true">⟁</div><div id="weapons">${(Object.keys(WEAPONS) as Weapon[]).map((w) => `<button class="weapon ${selected === w ? "selected" : ""}" data-weapon="${w}" ${save.unlocked.includes(w) ? "" : "disabled"}><strong>${WEAPONS[w].name}</strong><small>${save.unlocked.includes(w) ? WEAPONS[w].desc : w === "blade" ? "Unlock: complete your first run" : "Unlock: reach wave 4"}</small></button>`).join("")}</div><button class="primary" id="start">ENTER THE LOOP</button><div class="row"><button class="secondary" id="how">HOW TO PLAY</button><button class="secondary" id="settings">SETTINGS</button></div><div class="muted">BEST ${save.highScore.toLocaleString()} · ${save.wins} CYCLES BROKEN</div><div class="footer">BLACKHOUSE · ORIGINAL BROWSER GAME · BUILD 0.8</div>`,
  );
  document.querySelectorAll<HTMLButtonElement>("[data-weapon]").forEach(
    (b) =>
      (b.onclick = () => {
        selected = b.dataset.weapon as Weapon;
        menu();
      }),
  );
  bind("start", () => start(!save.tutorial));
  bind("how", () => help());
  bind("settings", () => settings(false));
}
function help() {
  panel(
    `<div class="eyebrow">The revenant’s covenant</div><h2>Fight beside your past.</h2><p>Move with <b>WASD / arrows</b> or the left thumbstick. Your weapon attacks the nearest enemy automatically.</p><p>After five seconds, press <b>Space / ECHO</b>. A ghost repeats your exact last five seconds of movement and attacks, dealing real damage.</p><p>Move around the arena before summoning to create crossfire. Up to <b>two Echoes</b> can coexist with cooldown upgrades. Red lines and rings warn of enemy attacks.</p><p>Survive nine waves, choose a boon after each, and defeat the three-phase Hollow Sovereign. A run lasts about 7–10 minutes.</p><button class="primary" id="learn">PLAY INTERACTIVE TUTORIAL</button><button class="secondary" id="back">BACK</button>`,
  );
  bind("learn", () => start(true));
  bind("back", menu);
}
function start(withTutorial = false) {
  sound.unlock();
  resetInput();
  game = new Game(selected);
  game.onEvent = event;
  paused = false;
  screen = "game";
  overlay.innerHTML = "";
  hud.hidden = false;
  controls.hidden = false;
  tutorial = withTutorial ? 1 : 0;
  tutorialMove = 0;
  if (tutorial) {
    game.spawnTimer = 999;
    showTutorial();
  } else notify(ARENAS[0].name);
  renderHUD();
}
function showTutorial() {
  if (tutorial === 1)
    overlay.innerHTML =
      '<div class="tutorial"><strong>01 · Become the revenant</strong><p>Move with the left stick or WASD / arrows.</p></div>';
  if (tutorial === 2)
    overlay.innerHTML =
      '<div class="tutorial"><strong>02 · Leave a memory</strong><p>Your weapon attacks automatically. Keep moving while five seconds are recorded.</p></div>';
  if (tutorial === 3)
    overlay.innerHTML =
      '<div class="tutorial"><strong>03 · Call your past</strong><p>Tap ECHO or press Space. Your ghost repeats your path and attacks.</p></div>';
}
function doEcho() {
  if (paused || !game) return;
  if (game.summon() && tutorial === 3) {
    tutorial = 0;
    save.tutorial = true;
    persist();
    overlay.innerHTML = "";
    game.waveTime = 0;
    game.spawnTimer = 2;
    notify("Memory awakened. Survive the cloister.");
  }
}
function event(name: string) {
  sound.play(name);
  if (name === "hurt" && save.shake) renderer.shake = 5;
  if (name === "phase") {
    notify(
      "The Sovereign awakens · phase " +
        game?.enemies.find((e) => e.kind === "boss")?.phase,
    );
    if (save.shake) renderer.shake = 7;
  }
  if (name === "boss") notify("HOLLOW SOVEREIGN · Break the cycle");
  if (name === "upgrade") upgrade();
  if (name === "wave") {
    if (game!.wave === 4 && !save.unlocked.includes("lance")) {
      save.unlocked.push("lance");
      persist();
      notify("Void Lance unlocked for your next run");
    } else
      notify(
        game!.wave === 10
          ? "The final covenant"
          : `Wave ${game!.wave} · ${ARENAS[game!.arena].name}`,
      );
  }
  if (name === "won" || name === "lost") results();
}
function upgrade() {
  screen = "upgrade";
  controls.hidden = true;
  resetInput();
  panel(
    `<div class="eyebrow">Wave ${game!.wave} survived</div><h2>Claim a memory.</h2><p>Choose one boon. Restore 12 health before the next wave.</p>${game!.choices.map((u) => `<button class="choice" data-upgrade="${u.id}"><small>${u.tag} · RANK ${(game!.levels[u.id] || 0) + 1}</small><strong>${u.name}</strong><span>${u.desc}</span></button>`).join("")}<p class="muted">${game!.kills} SOULS · ${Math.ceil(game!.player.hp)} / ${game!.player.max} HEALTH</p>`,
  );
  document.querySelectorAll<HTMLButtonElement>("[data-upgrade]").forEach(
    (b) =>
      (b.onclick = () => {
        sound.unlock();
        if (game!.choose(b.dataset.upgrade as Parameters<Game["choose"]>[0])) {
          overlay.innerHTML = "";
          screen = "game";
          controls.hidden = false;
        }
      }),
  );
}
function results() {
  const g = game!;
  clearToast();
  hud.hidden = true;
  screen = "results";
  controls.hidden = true;
  resetInput();
  const won = g.state === "won";
  g.score += Math.floor(g.time) * 2 + (won ? 3000 : 0);
  const record = g.score > save.highScore;
  save.highScore = Math.max(save.highScore, g.score);
  save.runs++;
  save.wins += won ? 1 : 0;
  save.bestWave = Math.max(save.bestWave, g.wave);
  save.totalEchoes += g.echoUses;
  const unlock = !save.unlocked.includes("blade");
  if (unlock) save.unlocked.push("blade");
  if (g.wave >= 4 && !save.unlocked.includes("lance"))
    save.unlocked.push("lance");
  persist();
  panel(
    `<div class="brand">BLACK<b>HOUSE</b></div><div class="eyebrow">${won ? "The sovereign is unmade" : "The house remembers"}</div><h2>${won ? "CYCLE BROKEN" : "YOU WILL RETURN"}</h2><p class="tagline">${won ? "At last, your past has set you free." : "Death is only another memory."}</p><div class="statgrid"><div><b>${g.score.toLocaleString()}</b><small>${record ? "NEW HIGH SCORE" : "SCORE"}</small></div><div><b>${Math.floor(g.time / 60)}:${Math.floor(
      g.time % 60,
    )
      .toString()
      .padStart(
        2,
        "0",
      )}</b><small>TIME SURVIVED</small></div><div><b>${g.kills}</b><small>SOULS RELEASED</small></div><div><b>${g.echoKills}</b><small>ECHO KILLS</small></div></div><p>Wave ${g.wave} / 10 · ${g.echoUses} memories summoned</p>${unlock ? '<p style="color:#bdf4db">Crescent Blade unlocked.</p>' : ""}<button class="primary" id="restart">RETURN TO THE LOOP</button><button class="secondary" id="menu">CHOOSE WEAPON</button>`,
  );
  bind("restart", () => start(false));
  bind("menu", menu);
}
function pause() {
  if (!game || game.state !== "playing" || screen === "settings") return;
  paused = !paused;
  resetInput();
  controls.hidden = paused;
  if (paused) {
    sound.suspend();
    screen = "pause";
    panel(
      `<div class="eyebrow">Time stands still</div><h2>Memory suspended.</h2><p>Wave ${game.wave} · ${WEAPONS[game.weapon].name}</p><button class="primary" id="resume">RESUME</button><button class="secondary" id="settings">SETTINGS</button><button class="secondary" id="quit">END RUN</button>`,
    );
    bind("resume", pause);
    bind("settings", () => settings(true));
    bind("quit", () => {
      game!.state = "lost";
      results();
    });
  } else {
    sound.unlock();
    screen = "game";
    overlay.innerHTML = "";
    if (tutorial) showTutorial();
  }
}
function settings(fromRun: boolean) {
  screen = "settings";
  panel(
    `<div class="eyebrow">Make the house your own</div><h2>Settings</h2><div class="settings"><label>Synthesized sound & ambience<input type="checkbox" id="sound" ${save.sound ? "checked" : ""}></label><label>Screen shake<input type="checkbox" id="shake" ${save.shake ? "checked" : ""}></label><label>Visual quality<select id="quality"><option value="auto" ${save.quality === "auto" ? "selected" : ""}>Adaptive</option><option value="low" ${save.quality === "low" ? "selected" : ""}>Low</option></select></label></div><p>Progress is saved on this browser. No account required.</p><p class="muted">${save.runs} RUNS · BEST WAVE ${save.bestWave} · ${save.totalEchoes} ECHOES</p><button class="primary" id="back">BACK</button>`,
  );
  $<HTMLInputElement>("#sound").onchange = (e) => {
    save.sound = (e.target as HTMLInputElement).checked;
    sound.set(save.sound);
    sound.unlock();
    persist();
  };
  $<HTMLInputElement>("#shake").onchange = (e) => {
    save.shake = (e.target as HTMLInputElement).checked;
    persist();
  };
  $<HTMLSelectElement>("#quality").onchange = (e) => {
    save.quality = (e.target as HTMLSelectElement).value as "auto" | "low";
    renderer.low = save.quality === "low";
    renderer.resize();
    persist();
  };
  bind("back", () => {
    if (fromRun) {
      screen = "game";
      paused = false;
      pause();
    } else menu();
  });
}
function renderHUD() {
  if (!game) return;
  const g = game,
    boss = g.enemies.find((e) => e.kind === "boss" && e.hp > 0);
  if (!document.getElementById("health-value")) {
    hud.innerHTML =
      '<div class="hudtop"><div><span id="health-value"></span><div class="health"><i id="health-fill"></i></div></div><div class="hudwave"><span id="wave-label"></span><br><span id="score-label"></span></div><button id="pause" aria-label="Pause game">Ⅱ</button></div><div class="chapter" id="chapter-label"></div><div class="bossbar" id="boss-health"><span></span><div><i></i></div></div>';
    bind("pause", pause);
  }
  $("#health-value").textContent =
    `${Math.ceil(g.player.hp)} / ${g.player.max}`;
  $("#health-fill").style.width = `${(g.player.hp / g.player.max) * 100}%`;
  $("#wave-label").textContent = `WAVE ${g.wave} / 10`;
  $("#score-label").textContent = `${Math.floor(g.time / 60)}:${Math.floor(
    g.time % 60,
  )
    .toString()
    .padStart(2, "0")} · ${g.score}`;
  $("#chapter-label").textContent =
    ARENAS[g.arena].name +
    (g.wave < 10
      ? " · " +
        (g.waveTime < g.waveDuration
          ? Math.ceil(g.waveDuration - g.waveTime) + "s"
          : "Clear the remaining souls")
      : "");
  $("#boss-health").hidden = !boss;
  if (boss) {
    $("#boss-health span").textContent =
      `HOLLOW SOVEREIGN · PHASE ${boss.phase}`;
    $("#boss-health i").style.width =
      `${Math.max(0, (boss.hp / boss.max) * 100)}%`;
  }
  echo.classList.toggle("unready", !g.ready);
  echo.innerHTML = `ECHO<small>${g.ready ? "READY" : g.cooldown > 0 ? g.cooldown.toFixed(1) + "s" : "RECORDING"}</small><small>${g.echoes.length} / 2 ACTIVE</small>`;
}
function pointerMove(e: PointerEvent) {
  if (e.pointerId !== stickId) return;
  const r = stick.getBoundingClientRect(),
    dx = e.clientX - r.left - r.width / 2,
    dy = e.clientY - r.top - r.height / 2,
    scale = r.width / 104,
    len = Math.hypot(dx, dy),
    max = 34 * scale;
  move = { x: dx / Math.max(max, len), y: dy / Math.max(max, len) };
  knob.style.transform = `translate(${move.x * 34}px,${move.y * 34}px)`;
}
stick.addEventListener("pointerdown", (e) => {
  if (stickId !== null) return;
  sound.unlock();
  e.preventDefault();
  stickId = e.pointerId;
  stick.setPointerCapture(e.pointerId);
  pointerMove(e);
});
stick.addEventListener("pointermove", pointerMove);
for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
  stick.addEventListener(name, ((e: PointerEvent) => {
    if (e.pointerId === stickId) {
      stickId = null;
      move = { x: 0, y: 0 };
      knob.style.transform = "";
    }
  }) as EventListener);
echo.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  sound.unlock();
  doEcho();
});
window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key))
    e.preventDefault();
  keys.add(e.key.toLowerCase());
  if (!e.repeat && e.code === "Space") doEcho();
  if (!e.repeat && (e.key === "Escape" || e.key.toLowerCase() === "p")) pause();
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  resetInput();
  if (game?.state === "playing" && !paused) pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    resetInput();
    sound.suspend();
    if (game?.state === "playing" && !paused) pause();
  }
});
window.addEventListener("resize", () => renderer.resize());
function tick(now: number) {
  const elapsed = (now - last) / 1000,
    dt = Math.min(0.05, elapsed);
  last = now;
  if (elapsed > 0.026 && elapsed < 0.2) slowFrames++;
  else slowFrames = Math.max(0, slowFrames - 1);
  if (slowFrames > 180 && !renderer.low) {
    renderer.low = true;
    renderer.resize();
  }
  if (game && !paused && game.state === "playing") {
    const input = {
      x:
        move.x +
        (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
        (keys.has("a") || keys.has("arrowleft") ? 1 : 0),
      y:
        move.y +
        (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
        (keys.has("w") || keys.has("arrowup") ? 1 : 0),
    };
    if (tutorial) {
      game.player.hp = game.player.max;
      game.waveTime = 0;
      if (tutorial === 1) {
        tutorialMove += Math.hypot(input.x, input.y) * dt;
        if (tutorialMove > 1.4) {
          tutorial = 2;
          game.spawn("husk", W / 2, 160);
          showTutorial();
        }
      }
      if (tutorial === 2 && game.ready) {
        tutorial = 3;
        showTutorial();
      }
    }
    game.update(dt, input);
  }
  renderer.draw(game, now / 1000);
  hudTimer -= dt;
  if (hudTimer <= 0) {
    renderHUD();
    hudTimer = 0.1;
  }
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) toast.classList.remove("show");
  }
  requestAnimationFrame(tick);
}
menu();
requestAnimationFrame(tick);
// Explicit opt-in test bridge is excluded from normal play and contains no remote access.
if (import.meta.env.DEV && new URLSearchParams(location.search).has("test"))
  Object.assign(window, {
    __revenant: {
      get game() {
        return game;
      },
      start,
      menu,
      get save() {
        return save;
      },
      get paused() {
        return paused;
      },
    },
  });
