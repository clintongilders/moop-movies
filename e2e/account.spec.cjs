const { test, expect } = require("@playwright/test");
test("browser approval, authenticated watchlist update and local sign-out", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Only TMDB's approval website is simulated; the built app and Express auth flow run normally.
  await page.route(
    "https://www.themoviedb.org/authenticate/**",
    async (route) => {
      const callback = new URL(
        new URL(route.request().url()).searchParams.get("redirect_to"),
      );
      callback.searchParams.set("request_token", "fixture-request");
      callback.searchParams.set("approved", "true");
      await route.fulfill({
        contentType: "text/html",
        body: `<a href="${callback.toString().replace(/&/g, "&amp;")}">Approve fixture account</a>`,
      });
    },
  );
  await page.goto("/account");
  await page.getByRole("button", { name: "Sign in with TMDB" }).click();
  await page.getByRole("link", { name: "Approve fixture account" }).click();
  await expect(page.getByText("browser-tester")).toBeVisible();
  await page.goto("/movie/42");
  await page
    .getByRole("button", { name: "Add to watchlist", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove from watchlist" }),
  ).toBeVisible();
  await page.goto("/account");
  await expect(
    page.getByRole("link", { name: "View details for Fixture movie" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("button", { name: "Sign in with TMDB" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
