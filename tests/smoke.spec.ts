import { expect, test } from "@playwright/test";

test.describe("authentication smoke tests", () => {
  test("sign-in page renders the login form", async ({ page }) => {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in|log in/i }),
    ).toBeVisible();
  });

  test("sign-up page renders the registration form", async ({ page }) => {
    await page.goto("/sign-up", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/sign-up/);
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create|sign up|register/i }),
    ).toBeVisible();
  });

  test("signed-out users are redirected away from the dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});
