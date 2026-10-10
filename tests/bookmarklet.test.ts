// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { BOOKMARKLET_CODE } from "../src/components/Header";

it("exports valid bookmarklet URI with protocol prefix", () => {
  expect(BOOKMARKLET_CODE.startsWith("javascript:(function(){")).toBe(true);
  expect(BOOKMARKLET_CODE.endsWith("})();")).toBe(true);
});

it("opens converter website in new tab when executed", () => {
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

  const js = BOOKMARKLET_CODE.replace(/^javascript:/, "");
  new Function(js)();

  expect(openSpy).toHaveBeenCalledWith(
    import.meta.env.VITE_APP_BASE_URL ||
      "https://h5p-to-pdf-converter.web.app/",
    "_blank",
  );

  openSpy.mockRestore();
});
