import { test, expect } from "@playwright/test";
import QRCode from "qrcode";
const base = process.env.TRIPPOCKET_LIVE_URL;
test.skip(!base, "Set TRIPPOCKET_LIVE_URL to run the deployed smoke tests.");
test("deployed pocket saves and reopens offline", async ({ page, context }) => {
  await page.goto(base!);
  await expect(
    page.getByRole("heading", { name: "Away you go." }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect(page.locator(".sync-label")).toContainText("Saved to cloud", {
    timeout: 20000,
  });
  const token = await page.evaluate(() =>
    localStorage.getItem("trippocket-device"),
  );
  const result = await page.request.get(base + "/api/wallet", {
    headers: { "X-Wallet-Token": token! },
  });
  expect(result.status()).toBe(200);
  expect((await result.json()).wallet.trips).toHaveLength(2);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Away you go." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /A little London escape/ }).click();
  await page
    .getByRole("button", { name: /Aer Lingus.*Dublin to London/ })
    .click();
  await expect(
    page.getByRole("dialog").getByText("DEMO42", { exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.request.put(base + "/api/wallet", {
    headers: { "X-Wallet-Token": token! },
    data: { wallet: { trips: [] } },
  });
});
test("live vision reads surrounding text with the QR photo", async ({
  page,
  request,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "One live model request is sufficient.",
  );
  test.setTimeout(60000);
  const qr = await QRCode.toDataURL("TRIPPOCKET:DEMO:BILLBOARD", {
    width: 220,
  });
  await page.setContent(
    `<html><body style="margin:0;width:700px;background:white;color:black;font:28px Arial;padding:35px"><h1>DEMO JAZZ NIGHT</h1><p>Fictional Riverside Hall</p><p>Date: 2026-12-05</p><p>Time: 19:30</p><p>Ticket reference: DEMO-JAZZ</p><img src="${qr}"><p>FICTIONAL TEST POSTER ONLY</p></body></html>`,
  );
  const image =
    "data:image/png;base64," +
    (await page.screenshot({ fullPage: true })).toString("base64");
  const token = crypto.randomUUID() + crypto.randomUUID();
  const response = await request.post(base + "/api/extract", {
    headers: { "X-Wallet-Token": token },
    data: {
      category: "ticket",
      text: "Read the entire fictional poster.",
      image,
      qr: "TRIPPOCKET:DEMO:BILLBOARD",
    },
    timeout: 55000,
  });
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.notice).toContain("free AI model");
  expect(data.item.title.toLowerCase()).toContain("jazz");
  expect((data.item.location + " " + data.item.notes).toLowerCase()).toContain(
    "riverside",
  );
  expect(data.item.date).toBe("2026-12-05");
  expect(data.item.qr).toBe("");
});
