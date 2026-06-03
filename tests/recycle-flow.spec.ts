import { test, expect } from "@playwright/test";

test("Dispatcher Dashboard should load elements successfully", async ({ page }) => {
  await page.goto("/dispatcher");

  // Check header title
  const header = page.locator("h1");
  await expect(header).toContainText("Dispatcher Dashboard");

  // Check presence of import box
  const importText = page.locator("text=อัปโหลดจุดเก็บขยะ (Import)");
  await expect(importText).toBeVisible();

  // Check map canvas
  const mapElement = page.locator(".leaflet-container");
  await expect(mapElement).toBeVisible();

  // Check run CVRP optimization button
  const optimizeBtn = page.locator("button:has-text('คำนวณเส้นทาง')");
  await expect(optimizeBtn).toBeVisible();
});

test("Driver Portal (LINE LIFF simulation) should render select profile dropdown", async ({ page }) => {
  await page.goto("/driver");

  // Check LINE LIFF header simulated title
  const title = page.locator("text=RECYCLE ROUTE (LINE LIFF)");
  await expect(title).toBeVisible();

  // Check presence of developer simulation mode dropdown
  const selector = page.locator("select");
  await expect(selector).toBeVisible();
});
