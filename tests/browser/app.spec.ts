import { expect, test } from "@playwright/test";

const newHome = "https://h5p-to-pdf-converter.web.app";

test("the old page shows the prank notice and links to the new app", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Halaa, nascam ka! — H5P domain update");
  await expect(
    page.getByRole("heading", { name: "HALAA, NASCAM KA!" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "halaa nascam ka, de joke lang.. updated the domain, ito na gamitin niyo ->",
      { exact: true },
    ),
  ).toBeVisible();

  const handoff = page.getByRole("link", { name: "Open the updated app" });
  await expect(handoff).toHaveAttribute("href", newHome);
  await expect(
    page.getByText(
      "Walang forms, log in, o uploads dito. Prank notice lang ito.",
    ),
  ).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);

  const meme = page.getByRole("img", {
    name: "Nick Wilde gives a knowing look",
  });
  await expect(meme).toBeVisible();
  await expect(meme).toHaveAttribute("src", /nick-wilde-zootopia-2\.gif$/);
  expect(
    await meme.evaluate(
      (element) => (element as HTMLImageElement).naturalWidth,
    ),
  ).toBeGreaterThan(0);
});
