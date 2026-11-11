import { test, expect } from "@playwright/test";
import QRCode from "qrcode";
async function trip(page: any) {
  await page.goto("/");
  await page.getByRole("button", { name: /A little London escape/ }).click();
}
async function add(page: any) {
  const btn = page.getByRole("button", { name: "Add to trip", exact: true });
  if (await btn.isVisible()) await btn.click();
  else
    await page.getByRole("button", { name: "Add item", exact: true }).click();
}
test("shows a responsive home and presents a pass", async ({ page }) => {
  await trip(page);
  await expect(
    page.getByRole("heading", { name: "A little London escape" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Aer Lingus.*Dublin to London/ })
    .click();
  await expect(
    page.getByRole("dialog").getByText("DEMO42", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Present this item" }).click();
  await expect(
    page.getByRole("heading", { name: "Ready to show" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish showing" }).click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("creates and persists a trip and manually adds a passport photo", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Where to next/ }).click();
  await page.getByLabel("Trip name").fill("Test adventure");
  await page.getByLabel("Destination", { exact: true }).fill("Paris, France");
  await page.getByLabel("First day").fill("2027-04-01");
  await page.getByLabel("Last day").fill("2027-04-04");
  await page.getByRole("button", { name: "Create my trip" }).click();
  await expect(
    page.getByRole("heading", { name: "Test adventure" }),
  ).toBeVisible();
  await add(page);
  await page.getByRole("button", { name: "Add manually" }).click();
  await page.getByRole("combobox", { name: "Type", exact: true }).selectOption("passport");
  await page.getByLabel("Give it a name").fill("Demo passport");
  await page.getByLabel("Demo document number").fill("DEMO123");
  const img = await QRCode.toBuffer("DEMO-PASSPORT");
  await page
    .locator(".attachment input")
    .setInputFiles({ name: "demo.png", mimeType: "image/png", buffer: img });
  await expect(page.getByAltText("Attached demo document")).toBeVisible();
  await page.getByRole("button", { name: "Save to my trip" }).click();
  await expect(
    page.getByRole("button", { name: /Identity.*Demo passport/ }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Test adventure/ }).click();
  await page.getByRole("button", { name: /Identity.*Demo passport/ }).click();
  await expect(
    page.getByAltText("Saved full original-context photo"),
  ).toBeVisible();
});
test("imports sample text, reviews it, and saves only on confirmation", async ({
  page,
}) => {
  await page.route("**/api/extract", (r) =>
    r.fulfill({
      json: {
        item: {
          category: "flight",
          title: "Imported demo flight",
          provider: "Aer Lingus",
          reference: "EXMP42",
          date: "2026-12-04",
          time: "09:40",
          from: "Dublin",
          to: "London",
        },
        notice: "Test model response",
      },
    }),
  );
  await trip(page);
  await add(page);
  await page.getByRole("button", { name: "Try a sample booking" }).click();
  await page
    .getByRole("button", { name: "Organise details", exact: true })
    .click();
  await expect(page.getByLabel("Booking / ticket reference")).toHaveValue(
    "EXMP42",
  );
  await page.getByLabel("Booking / ticket reference").fill("EDITED42");
  await page.getByRole("button", { name: "Save to my trip" }).click();
  await page.getByRole("button", { name: /Imported demo flight/ }).click();
  await expect(
    page.getByRole("dialog").getByText("EDITED42", { exact: true }),
  ).toBeVisible();
});
test("flags missing details and supports accept anyway", async ({ page }) => {
  await trip(page);
  await add(page);
  await page.getByRole("button", { name: "Add manually" }).click();
  await page.getByLabel("Give it a name").fill("Details to come");
  await expect(
    page.getByRole("button", { name: "Save to my trip" }),
  ).toBeDisabled();
  await page.getByLabel("Save anyway").check();
  await page.getByRole("button", { name: "Save to my trip" }).click();
  await expect(
    page.getByRole("button", { name: /Details to come/ }),
  ).toBeVisible();
});
test("decodes QR and sends the whole photo to the importer", async ({
  page,
}) => {
  let payload: any;
  await page.route("**/api/extract", async (r) => {
    payload = r.request().postDataJSON();
    await r.fulfill({
      json: {
        item: {
          category: "ticket",
          title: "Photo test",
          provider: "Event",
          reference: "DEMO",
          date: "2026-12-05",
        },
        notice: "Test model response",
      },
    });
  });
  await trip(page);
  await add(page);
  await page.getByRole("button", { name: "Photo or QR" }).click();
  await page
    .locator("input.visually-hidden")
    .setInputFiles({
      name: "qr.png",
      mimeType: "image/png",
      buffer: await QRCode.toBuffer("TRIPPOCKET:DEMO:QR", { width: 700 }),
    });
  await expect(page.getByText(/QR decoded: TRIPPOCKET:DEMO:QR/)).toBeVisible();
  await page
    .getByRole("button", { name: "Organise details", exact: true })
    .click();
  await expect(page.getByLabel("Give it a name")).toHaveValue("Photo test");
  expect(payload.qr).toBe("TRIPPOCKET:DEMO:QR");
  expect(payload.image).toMatch(/^data:image\/jpeg;base64,/);
});
test("AI failure leaves manual entry available", async ({ page }) => {
  await page.route("**/api/extract", (r) =>
    r.fulfill({ status: 503, json: { error: "Free AI unavailable." } }),
  );
  await trip(page);
  await add(page);
  await page.getByRole("button", { name: "Try a sample booking" }).click();
  await page
    .getByRole("button", { name: "Organise details", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Free AI unavailable");
  await page
    .getByRole("button", { name: "I’ll fill in the details myself" })
    .click();
  await expect(page.getByLabel("Give it a name")).toBeVisible();
});
test("home layout stays within the viewport", async ({ page }, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Away you go." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/home-${info.project.name}.png`,
    fullPage: true,
  });
});
