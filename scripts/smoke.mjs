import { chromium, webkit, devices, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const url = process.env.SMOKE_URL || "http://127.0.0.1:4173/";
await mkdir("docs/screenshots", { recursive: true });
for (const [name, engine] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await engine.launch();
  const context = await browser.newContext({
    ...devices["iPhone SE"],
    viewport: { width: 320, height: 568 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const response = await page.goto(url + "?test");
  assert.equal(response.status(), 200);
  assert.equal(await page.evaluate(() => "__revenant" in window), false);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({ path: `docs/screenshots/release-${name}-menu.png` });
  await page.locator("#start").click();
  await page.keyboard.down("d");
  await page.getByText("02 · Leave a memory").waitFor();
  await page.keyboard.up("d");
  await page.getByText("03 · Call your past").waitFor();
  await page.locator("#echo").tap();
  await page.getByText("03 · Call your past").waitFor({ state: "detached" });
  await expect(page.locator("#echo")).toContainText(/3\.[0-2]s/);
  await expect(page.locator("#echo")).toContainText("READY");
  await page.locator("#echo").tap();
  await expect(page.locator("#echo")).toContainText("2 / 2 ACTIVE");
  await page.keyboard.down("a");
  await page.waitForTimeout(600);
  await page.keyboard.up("a");
  await page.screenshot({
    path: `docs/screenshots/release-${name}-combat.png`,
  });
  await page.getByRole("button", { name: "Pause game" }).tap();
  await page.getByRole("button", { name: "SETTINGS", exact: true }).tap();
  await page.getByLabel("Synthesized sound").uncheck();
  await page.getByRole("button", { name: "BACK", exact: true }).tap();
  await page.getByRole("button", { name: "END RUN" }).tap();
  await page.getByText("YOU WILL RETURN").waitFor();
  await page.getByRole("button", { name: "RETURN TO THE LOOP" }).tap();
  await page.getByRole("button", { name: "Pause game" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    `${name}: production tutorial, combat, Echo, settings, end run, restart, 320x568 layout, no test bridge or console errors PASS (${url})`,
  );
  await browser.close();
}
