import { test, expect } from "@playwright/test";

test("blocked storage still launches and reports unsaved progress", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    }),
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?test");
  await page.getByRole("button", { name: "ENTER THE LOOP" }).click();
  await page.getByRole("button", { name: "Pause game" }).click();
  await page.getByRole("button", { name: "END RUN" }).click();
  await expect(page.getByText("YOU WILL RETURN")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Storage unavailable");
  expect(errors).toEqual([]);
});

test("small viewport, cancellation, blur and resize preserve a paused run", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?test");
  await expect(page.locator("#start")).toBeInViewport();
  await page.evaluate(() => {
    const api = (window as any).__revenant;
    api.start(false);
    api.game.spawnTimer = 999;
  });
  const stick = page.locator("#stick");
  await stick.evaluate((el) =>
    el.addEventListener("pointerdown", (e) => {
      (window as any).__pointerId = (e as PointerEvent).pointerId;
    }),
  );
  const bounds = (await stick.boundingBox())!;
  const before = await page.evaluate(
    () => (window as any).__revenant.game.player.x,
  );
  await page.mouse.move(
    bounds.x + bounds.width * 0.8,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await expect
    .poll(() => page.evaluate(() => (window as any).__revenant.game.player.x))
    .toBeGreaterThan(before);
  await stick.dispatchEvent("pointercancel", {
    pointerId: await page.evaluate(() => (window as any).__pointerId),
  });
  await page.mouse.up();
  const x = await page.evaluate(() => (window as any).__revenant.game.player.x);
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => (window as any).__revenant.game.player.x),
  ).toBe(x);
  await page.keyboard.down("d");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.keyboard.up("d");
  await expect(page.getByText("Memory suspended.")).toBeVisible();
  const time = await page.evaluate(() => (window as any).__revenant.game.time);
  await page.setViewportSize({ width: 568, height: 320 });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).__revenant.game.time)).toBe(
    time,
  );
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole("button", { name: "RESUME" }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__revenant.game.time))
    .toBeGreaterThan(time);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Space activates focused menu buttons", async ({ page }) => {
  await page.goto("/");
  await page.locator("#start").focus();
  await page.keyboard.press("Space");
  await expect(page.getByText("01 · Become the revenant")).toBeVisible();
});
