import { test, expect } from "@playwright/test";
import { archive, activity } from "../fixtures";
import { readFile } from "node:fs/promises";

test("the GitHub Pages handoff notice links to the Firebase app", async ({
  page,
}) => {
  test.skip(
    process.env.VITE_DEPLOY_TARGET !== "github-pages",
    "Runs against the GitHub Pages production build.",
  );
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
  await expect(
    page.getByRole("link", { name: "Open the updated app" }),
  ).toHaveAttribute("href", "https://h5p-to-pdf-converter.web.app");
  await expect(
    page.getByRole("img", { name: "Nick Wilde gives a knowing look" }),
  ).toBeVisible();
});

const upload = async (page: any, buffer: Buffer, name = "sample.h5p") =>
  page
    .locator("#h5p-files")
    .setInputFiles({ name, mimeType: "application/zip", buffer });
const stubGeminiMediaApi = (page: any) => {
  const requests: string[] = [];
  page.route(
    "https://generativelanguage.googleapis.com/**",
    async (route: any) => {
      const request = route.request();
      const url = request.url();
      requests.push(`${request.method()} ${url}`);

      if (url.endsWith("/upload/v1beta/files")) {
        await route.fulfill({
          status: 200,
          headers: {
            "access-control-expose-headers": "x-goog-upload-url",
            "x-goog-upload-url":
              "https://generativelanguage.googleapis.com/upload/session-1",
          },
          body: "{}",
        });
      } else if (url.endsWith("/upload/session-1")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            file: {
              name: "files/lecture-123",
              uri: "https://generativelanguage.googleapis.com/v1beta/files/lecture-123",
              mimeType: "video/mp4",
              state: "ACTIVE",
            },
          }),
        });
      } else if (url.endsWith("/files/lecture-123")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "{}",
        });
      } else if (url.includes(":generateContent")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [
                    { text: "[00:00] This is the verified lesson transcript." },
                  ],
                },
              },
            ],
          }),
        });
      } else {
        await route.fulfill({ status: 404, body: "not found" });
      }
    },
  );
  return requests;
};
test("empty upload view and policy pages share the site frame", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Drop a file here/ }),
  ).toBeVisible();
  const homeHeaderBounds = await page.locator("header > div").boundingBox();
  await expect(
    page.getByLabel("Search YouTube or paste a video URL"),
  ).toHaveCount(0);

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
  await expect
    .poll(async () => {
      const bounds = await page.locator("header > div").boundingBox();
      return bounds && homeHeaderBounds
        ? [bounds.x, bounds.y, bounds.width, bounds.height]
        : null;
    })
    .toEqual(
      homeHeaderBounds && [
        homeHeaderBounds.x,
        homeHeaderBounds.y,
        homeHeaderBounds.width,
        homeHeaderBounds.height,
      ],
    );
  await expect(
    page.getByRole("link", { name: /github/i }).first(),
  ).toHaveAttribute("href", "https://github.com/Soyaaaa081305/H5p-Auto-SS");
  await expect(
    page.getByRole("link", { name: "Back to study reviewer" }),
  ).toBeVisible();

  await page.goto("/terms");
  await expect(
    page.getByRole("heading", { name: "Terms of use" }),
  ).toBeVisible();
});

test("the old Soya route forwards to the project repository", async ({
  page,
}) => {
  await page.route("https://github.com/Soyaaaa081305/H5p-Auto-SS", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><title>Repository</title></html>",
    }),
  );
  await page.goto("/soya");
  await expect(page).toHaveURL("https://github.com/Soyaaaa081305/H5p-Auto-SS");
});

test("reviewer saves and checks a personal Gemini key", async ({ page }) => {
  await page.goto("/");
  await upload(page, await archive());
  await page.getByRole("button", { name: "Open Summary & reviewer" }).click();
  const dock = page.getByRole("complementary", {
    name: "Study reviewer extension",
  });
  await expect
    .poll(async () => {
      const bounds = await dock.boundingBox();
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth,
      );
      return bounds ? Math.round(bounds.x + bounds.width) - clientWidth : -1;
    })
    .toBe(0);
  const keyInput = page.getByLabel("Gemini API key");
  await expect(keyInput).toBeVisible();
  const generateButton = page.getByRole("button", {
    name: "Generate reviewer",
  });
  await expect(generateButton).toBeDisabled();

  await page.route("https://generativelanguage.googleapis.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ name: "models/gemini-3.8-flash" }),
    }),
  );
  await keyInput.fill("test-key");
  await page.getByRole("button", { name: "Save key" }).click();
  await expect(page.getByText("Key saved in this browser.")).toBeVisible();
  await page.getByRole("button", { name: "Test key" }).click();
  await expect(
    page.getByText("Key works with the selected Gemini model."),
  ).toBeVisible();

  const videoButton = page.getByRole("button", {
    name: "Video 1",
    exact: true,
  });
  await expect(videoButton).toHaveAttribute("aria-pressed", "false");
  await videoButton.click();
  await expect(videoButton).toHaveAttribute("aria-pressed", "true");
  await expect(generateButton).toBeEnabled();
});

test("study reviewer supports 3-stage width, simultaneous text+video selection, and custom prompt", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, await archive());
  const openButton = page.getByRole("button", {
    name: "Open Summary & reviewer",
  });
  const dock = page.getByRole("complementary", {
    name: "Study reviewer extension",
  });

  // Stage 1: First click opens compact (~30% width)
  await openButton.click();
  await expect
    .poll(async () => {
      const bounds = await dock.boundingBox();
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth,
      );
      if (!bounds) return -1;
      const widthRatio = bounds.width / clientWidth;
      return widthRatio > 0.2 && widthRatio < 0.45;
    })
    .toBe(true);

  // Stage 2: Second click on the same tab handle expands to 50%
  const tabHandle = page.getByRole("button", {
    name: "Collapse Summary & reviewer",
  });
  await tabHandle.click();
  await expect
    .poll(async () => {
      const bounds = await dock.boundingBox();
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth,
      );
      if (!bounds) return -1;
      const widthRatio = bounds.width / clientWidth;
      return Math.abs(widthRatio - 0.5) < 0.05;
    })
    .toBe(true);

  await page.getByLabel("Gemini API key").fill("test-key");
  await page.getByRole("button", { name: "Save key" }).click();

  // Test simultaneous text + video selection (e.g. Lesson text + Video 1)
  const textSourceBtn = page.getByRole("button", { name: /Lesson text/i });
  await expect(textSourceBtn).toHaveAttribute("aria-pressed", "true");
  const video1 = page.getByRole("button", { name: "Video 1", exact: true });
  await video1.click();
  await expect(video1).toHaveAttribute("aria-pressed", "true");
  // Both are pressed!
  await expect(textSourceBtn).toHaveAttribute("aria-pressed", "true");

  const customPromptSummary = page.getByText(
    "Custom prompt & instructions (optional)",
  );
  await expect(customPromptSummary).toBeVisible();
  await customPromptSummary.click();
  const promptInput = page.getByPlaceholder(/Focus on chapter 2/i);
  await expect(promptInput).toBeVisible();
  await promptInput.fill("Create 20 questions focusing on key terms");

  // Stage 3: Full screen expands from right to left (right edge pinned)
  const fullScreenButton = page.getByRole("button", { name: "Full screen" });
  await expect(fullScreenButton).toBeVisible();
  await fullScreenButton.click();
  await expect(page.getByRole("button", { name: "50% view" })).toBeVisible();
  await expect
    .poll(async () => {
      const bounds = await dock.boundingBox();
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth,
      );
      return bounds ? Math.round(bounds.x + bounds.width) - clientWidth : -1;
    })
    .toBe(0);

  await page.getByRole("button", { name: "50% view" }).click();
  await expect(page.getByRole("button", { name: "Full screen" })).toBeVisible();
});

test("reviewer dock and upload area stay usable at Android phone width", async ({
  browser,
}) => {
  const page = await browser.newPage({
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  await page.goto("/");

  const uploadArea = page.getByRole("button", {
    name: /Drop a file here, or click to browse/,
  });
  await expect(uploadArea).toBeVisible();
  const positions = await page.evaluate(() => {
    const main = document.querySelector("main")!.getBoundingClientRect();
    const drop = document
      .querySelector('[aria-describedby="study-file-types"]')!
      .getBoundingClientRect();
    return {
      mainCenter: main.top + main.height / 2,
      dropCenter: drop.top + drop.height / 2,
    };
  });
  expect(Math.abs(positions.mainCenter - positions.dropCenter)).toBeLessThan(
    110,
  );

  const h5pPicker = page.waitForEvent("filechooser");
  await uploadArea.tap();
  await (
    await h5pPicker
  ).setFiles({
    name: "sample.h5p",
    mimeType: "application/zip",
    buffer: await archive(),
  });
  const openButton = page.getByRole("button", {
    name: "Open Summary & reviewer",
  });
  await expect(openButton).toBeVisible();
  await openButton.tap();
  await expect(page.getByLabel("Gemini API key")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Collapse Summary & reviewer" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.getByLabel("Gemini API key").fill("mobile-test-key");
  await page.getByRole("button", { name: "Save key" }).tap();
  const mobileReviewer = page.locator("#study-reviewer");
  await expect(mobileReviewer).toBeVisible();
  const video1 = page.getByRole("button", { name: "Video 1", exact: true });
  await video1.tap();
  await expect(video1).toHaveAttribute("aria-pressed", "true");

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  const collapseButton = page.getByRole("button", {
    name: "Collapse Summary & reviewer",
  });
  await collapseButton.tap();
  await expect(
    page.getByRole("button", { name: "Open Summary & reviewer" }),
  ).toHaveAttribute("aria-expanded", "false");

  await page
    .getByRole("button", { name: "Remove Synthetic Book", exact: true })
    .tap();
  await page.locator("#h5p-files").setInputFiles({
    name: "lesson.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("A short lesson for mobile reviewer layout."),
  });
  await expect(page.getByRole("heading", { name: "lesson.txt" })).toBeVisible();
  await page.getByRole("button", { name: "Open Summary & reviewer" }).tap();
  await expect(page.getByLabel("Gemini API key")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.close();
});

test("local answers, external media, clipboard, PDF and responsive design", async ({
  page,
  context,
}, info) => {
  const outside: string[] = [],
    errors: string[] = [],
    exportRequests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (request) => {
    if (/(?:jspdf|pdfExporter)/i.test(request.url())) {
      exportRequests.push(request.url());
    }
  });
  await context.route("https://**/*", (route) => {
    outside.push(route.request().url());
    return route.fulfill({
      body: "<html><body>External media fixture</body></html>",
      contentType: "text/html",
    });
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await expect(page.getByText("H5P to PDF", { exact: true })).toBeVisible();
  expect(exportRequests).toEqual([]);
  await upload(page, await archive());
  await expect(
    page.getByRole("button", { name: "Answers", exact: true }),
  ).toBeVisible();
  await expect(page.locator('iframe[src*="youtube"]')).toBeVisible();
  await page.getByRole("button", { name: "Answers", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("status")).toContainText("8 answer activities");
  await expect(
    dialog.getByText("red / crimson", { exact: false }),
  ).toBeVisible();
  await expect(
    dialog.getByText("No answer key stored", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Copy", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Correct option 2: Two",
  );
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Answer PDF" }).click();
  const pdf = await download;
  expect(exportRequests.some((url) => /(?:jspdf|pdfExporter)/i.test(url))).toBe(
    true,
  );
  await pdf.saveAs(info.outputPath("answers.pdf"));
  expect(
    (await readFile(info.outputPath("answers.pdf"))).subarray(0, 4).toString(),
  ).toBe("%PDF");
  await page.screenshot({
    animations: "disabled",
    path: info.outputPath("answers-desktop.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    animations: "disabled",
    path: info.outputPath("answers-mobile.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.getByRole("button", { name: "Answers", exact: true }).click();
  await page.screenshot({
    animations: "disabled",
    path: info.outputPath("answers-dark.png"),
  });
  await dialog.getByRole("button", { name: "Close answers" }).click();
  expect(errors).toEqual([]);
  await expect.poll(() => outside.length).toBeGreaterThan(0);
  expect(outside.some((u) => u.includes("youtube"))).toBe(true);
});
test("keeps successful files and supports all-module answers and removal", async ({
  page,
}) => {
  await page.goto("/");
  const buffer = await archive();
  await page.locator("#h5p-files").setInputFiles([
    { name: "one.h5p", mimeType: "application/zip", buffer },
    {
      name: "bad.h5p",
      mimeType: "application/zip",
      buffer: Buffer.from("broken"),
    },
    { name: "two.h5p", mimeType: "application/zip", buffer },
  ]);
  await expect(page.getByRole("alert")).toContainText("1 file(s)");
  await page.getByRole("button", { name: "Answers", exact: true }).click();
  await page.getByLabel("Answer modules").selectOption("all");
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "16 answer activities",
  );
  await page.getByLabel("Search answers").fill("Choose both");
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "2 answer activities",
  );
});
test("long answer exports paginate without changing the extracted key", async ({
  page,
}, info) => {
  const long = "An extended answer with Unicode: café 日本語. ".repeat(500);
  const buffer = await archive(
    {
      questions: [
        activity("H5P.MultiChoice 1.16", {
          question: "Long answer",
          answers: [{ text: long, correct: true }],
        }),
      ],
    },
    "H5P.QuestionSet",
  );
  await page.goto("/");
  await upload(page, buffer);
  await page.getByRole("button", { name: "Answers", exact: true }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Answer PDF" }).click();
  await (await dl).saveAs(info.outputPath("long.pdf"));
  const pdf = await readFile(info.outputPath("long.pdf"));
  expect(
    (pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length,
  ).toBeGreaterThan(2);
});
const samples = process.env.H5P_SAMPLE_FILES?.split("|") || [];
test("local acceptance: both original laboratory books", async ({
  page,
}, info) => {
  test.skip(
    samples.length !== 2,
    "Set H5P_SAMPLE_FILES to two local paths separated by |. Files are never committed.",
  );
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().startsWith("https:")) requests.push(r.url());
  });
  await page.goto("/");
  await page.locator("input[type=file]").first().setInputFiles(samples);
  await page.getByRole("button", { name: "Answers", exact: true }).click();
  await page.getByLabel("Answer modules").selectOption("all");
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "10 answer activities",
  );
  await expect(
    page.getByRole("dialog").getByText("Target 5", { exact: false }),
  ).toBeVisible();
  expect(requests).toEqual([]);
  await page.screenshot({
    animations: "disabled",
    path: info.outputPath("laboratory-answers.png"),
  });
});
test("reset releases media URLs and batch PDF contains nested answers", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const state = { created: 0, revoked: 0 };
    (window as any).assetStats = state;
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      state.created++;
      return create(blob);
    };
    URL.revokeObjectURL = (url) => {
      state.revoked++;
      revoke(url);
    };
  });
  await page.goto("/");
  const buffer = await archive();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles([
      { name: "one.h5p", mimeType: "application/zip", buffer },
      { name: "two.h5p", mimeType: "application/zip", buffer },
    ]);
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export All (2) Study Guide", exact: true })
    .click();
  await (await dl).saveAs(info.outputPath("batch.pdf"));
  const bytes = await readFile(info.outputPath("batch.pdf"));
  expect(
    (bytes.toString("latin1").match(/\/Type \/Page\b/g) || []).length,
  ).toBeGreaterThan(2);
  await page.getByTitle("Close modules and upload another").click();
  const stats = await page.evaluate(() => (window as any).assetStats);
  expect(stats.created).toBeGreaterThan(0);
  await expect
    .poll(async () => page.evaluate(() => (window as any).assetStats.revoked))
    .toBe(stats.created);
});
test("local worker import can be cancelled before it completes", async ({
  page,
}) => {
  const bytes = await archive(
    { text: "x".repeat(9 * 1024 * 1024) },
    "H5P.AdvancedText",
  );
  await page.goto("/");
  await upload(page, bytes);
  await page.getByRole("button", { name: "Cancel import" }).click();
  await expect(page.getByRole("alert")).toContainText("cancelled");
  await expect(
    page.getByRole("button", { name: "Answers", exact: true }),
  ).toHaveCount(0);
});
test("service worker excludes imported content and caches only application assets", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => {}));
  await page.reload();
  await upload(page, await archive());
  await page.getByRole("button", { name: "Answers", exact: true }).click();
  await page.getByRole("button", { name: "Close answers" }).click();
  const cache = await page.evaluate(async () => {
    const names = (await caches.keys()).filter((name) =>
      name.startsWith("h5p-pdf-shell-"),
    );
    const urls = (
      await Promise.all(
        names.map(async (name) =>
          (await (await caches.open(name)).keys()).map((r) => r.url),
        ),
      )
    ).flat();
    return { names, urls, origin: new URL(location.href).origin };
  });
  expect(cache.names).toContain("h5p-pdf-shell-v4");
  expect(cache.urls.length).toBeGreaterThan(3);
  expect(
    cache.urls.every((url) => {
      const parsed = new URL(url);
      return (
        parsed.origin === cache.origin &&
        !parsed.search &&
        !parsed.pathname.toLowerCase().endsWith(".h5p") &&
        (parsed.pathname === "/" ||
          ["/index.html", "/manifest.webmanifest", "/favicon.svg"].includes(
            parsed.pathname,
          ) ||
          /^\/assets\/[\w.-]+\.(js|css|woff2?|png|svg)$/.test(parsed.pathname))
      );
    }),
  ).toBe(true);
  const removedPresentation = await page.request.get("/sample-module.h5p");
  if (removedPresentation.status() === 200) {
    expect(removedPresentation.headers()["content-type"]).toContain(
      "text/html",
    );
  } else {
    expect(removedPresentation.status()).toBe(404);
  }
  expect(
    (await removedPresentation.body()).subarray(0, 4).toString("hex"),
  ).not.toBe("504b0304");

  try {
    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByText("Drop a file here, or click to browse"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Answers", exact: true }),
    ).toHaveCount(0);
  } finally {
    await context.setOffline(false);
  }
});

test("file selection and both help dialogs work from the keyboard", async ({
  page,
}) => {
  await page.goto("/");
  const blackboardHelp = page.getByRole("button", {
    name: "How to download from Blackboard",
  });
  await blackboardHelp.click();
  const blackboardDialog = page.getByRole("dialog", {
    name: "How to download from Blackboard",
  });
  await expect(blackboardDialog).toBeVisible();
  await expect(
    blackboardDialog.getByRole("button", {
      name: "Close Blackboard download guide",
    }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    blackboardDialog.getByRole("button", { name: "Got It!" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(blackboardDialog).toHaveCount(0);
  await expect(blackboardHelp).toBeFocused();

  const uploadButton = page.getByRole("button", { name: /Drop a file here/ });
  await page.keyboard.press("Shift+Tab");
  await expect(uploadButton).toBeFocused();
  const fileChooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Enter");
  await (
    await fileChooser
  ).setFiles({
    name: "keyboard.h5p",
    mimeType: "application/zip",
    buffer: await archive(),
  });
  await expect(
    page.getByRole("button", { name: "Answers", exact: true }),
  ).toBeVisible();

  const bookmark = page.getByRole("link", { name: "Add Bookmark" });
  await bookmark.click();
  const bookmarkDialog = page.getByRole("dialog", {
    name: "H5P to PDF Quick Bookmark",
  });
  await expect(bookmarkDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(bookmarkDialog).toHaveCount(0);
  await expect(bookmark).toBeFocused();
});
test("presentation navigation, dark mode and PNG export retain slide geometry", async ({
  page,
}, info) => {
  const exportRequests: string[] = [];
  page.on("request", (request) => {
    if (/(?:jspdf|pdfExporter)/i.test(request.url())) {
      exportRequests.push(request.url());
    }
  });
  const content = {
    presentation: {
      slides: [
        {
          elements: [
            {
              x: 5,
              y: 5,
              width: 90,
              height: 30,
              action: activity("H5P.AdvancedText 1.1", { text: "First slide" }),
            },
          ],
        },
        {
          elements: [
            {
              x: 5,
              y: 5,
              width: 90,
              height: 80,
              action: activity("H5P.MultiChoice 1.16", {
                question: "Second slide question",
                answers: [{ text: "Yes", correct: true }],
              }),
            },
          ],
        },
      ],
    },
  };
  await page.goto("/");
  expect(exportRequests).toEqual([]);
  await upload(page, await archive(content, "H5P.CoursePresentation"));
  await expect(page.getByText("First slide", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Presentation Mode", exact: true })
    .click();
  await page.getByTitle("Next Slide (Arrow Right / Space)").click();
  await expect(
    page.getByText("Second slide question", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle Theme" }).click();
  await page.screenshot({
    animations: "disabled",
    path: info.outputPath("slides-dark.png"),
  });
  const dl = page.waitForEvent("download");
  await page.getByTitle("Download 1080p slide PNG").first().click();
  await (await dl).saveAs(info.outputPath("slide.png"));
  expect(exportRequests.some((url) => /(?:jspdf|pdfExporter)/i.test(url))).toBe(
    true,
  );
  const bytes = await readFile(info.outputPath("slide.png"));
  expect(bytes.readUInt32BE(16)).toBe(1920);
  expect(bytes.readUInt32BE(20)).toBe(1080);
});
