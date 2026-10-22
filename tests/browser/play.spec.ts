import { test, expect } from "@playwright/test";
test("menu, tutorial, movement, echo, pause, settings, defeat, save and restart", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?test");
  await expect(
    page.getByRole("heading", { name: "REVENANT LOOP" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ENTER THE LOOP" }).click();
  await expect(page.getByText("01 · Become the revenant")).toBeVisible();
  await page.keyboard.down("d");
  await expect(page.getByText("02 · Leave a memory")).toBeVisible({
    timeout: 10000,
  });
  await page.keyboard.up("d");
  await expect(page.getByText("03 · Call your past")).toBeVisible({
    timeout: 15000,
  });
  await page
    .getByRole("button", { name: "Summon temporal echo" })
    .dispatchEvent("pointerdown", { pointerId: 2 });
  await expect(page.getByText("03 · Call your past")).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as any).__revenant.game.echoUses),
  ).toBe(1);
  await page.keyboard.press("Escape");
  await expect(page.getByText("Memory suspended.")).toBeVisible();
  const time = await page.evaluate(() => (window as any).__revenant.game.time);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as any).__revenant.game.time)).toBe(
    time,
  );
  await page.getByRole("button", { name: "SETTINGS", exact: true }).click();
  await page.getByLabel("Synthesized sound").uncheck();
  await page.getByRole("button", { name: "BACK", exact: true }).click();
  await page.getByRole("button", { name: "RESUME" }).click();
  await page.evaluate(() => {
    const g = (window as any).__revenant.game;
    g.player.inv = 0;
    g.damagePlayer(9999, { x: 0, y: 0 });
  });
  await expect(page.getByText("YOU WILL RETURN")).toBeVisible();
  await expect(page.getByText("Crescent Blade unlocked.")).toBeVisible();
  await page.getByRole("button", { name: "RETURN TO THE LOOP" }).click();
  expect(
    await page.evaluate(() => (window as any).__revenant.game.player.hp),
  ).toBe(100);
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Crescent Blade/ }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});
test("upgrade, all arenas and boss victory UI", async ({ page }) => {
  await page.goto("/?test");
  await page.evaluate(() => (window as any).__revenant.start(false));
  for (let i = 1; i < 10; i++) {
    await page.evaluate(() => (window as any).__revenant.game.between());
    await page.locator(".choice").first().click();
  }
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__revenant.game.bossSpawned),
    )
    .toBe(true);
  expect(await page.evaluate(() => (window as any).__revenant.game.arena)).toBe(
    2,
  );
  await page.evaluate(() => {
    const g = (window as any).__revenant.game;
    g.hurt(
      g.enemies.find((e: any) => e.kind === "boss"),
      99999,
      true,
    );
  });
  await expect(
    page.getByRole("heading", { name: "CYCLE BROKEN" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/victory.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "CHOOSE WEAPON" }).click();
  await expect(page.getByRole("button", { name: /Void Lance/ })).toBeEnabled();
});
test("simultaneous touch movement and echo retains joystick pointer", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName !== "chromium" || !isMobile,
    "CDP multitouch is Chromium mobile only",
  );
  await page.goto("/?test");
  await page.evaluate(() => {
    const api = (window as any).__revenant;
    api.start(false);
    const g = api.game;
    g.spawnTimer = 999;
    for (let i = 0; i < 310; i++) g.update(1 / 60, { x: 0, y: 0 });
  });
  const client = await page.context().newCDPSession(page);
  const stick = await page.locator("#stick").boundingBox(),
    echo = await page.locator("#echo").boundingBox();
  const x = stick!.x + stick!.width * 0.8,
    y = stick!.y + stick!.height / 2;
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, id: 1 }],
  });
  await page.waitForTimeout(200);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x, y, id: 1 },
      { x: echo!.x + echo!.width / 2, y: echo!.y + echo!.height / 2, id: 2 },
    ],
  });
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(() => (window as any).__revenant.game.echoUses),
  ).toBe(1);
  const before = await page.evaluate(
    () => (window as any).__revenant.game.player.x,
  );
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [{ x, y, id: 1 }],
  });
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => (window as any).__revenant.game.player.x),
  ).toBeGreaterThan(before);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.screenshot({ path: "test-results/mobile-combat.png" });
});
