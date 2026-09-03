import { describe, expect, test } from "vitest";
import { isBnPath, routeLocale, toggleTarget } from "../i18n";

describe("routeLocale", () => {
  test("Bangla prefix is always bn", () => {
    expect(routeLocale("/bn")).toBe("bn");
    expect(routeLocale("/bn/")).toBe("bn");
    expect(routeLocale("/bn/scholarships")).toBe("bn");
  });

  test("localized English homepage is en, even if preference would be bn", () => {
    expect(routeLocale("/")).toBe("en");
  });

  test("non-localized pages defer to stored preference", () => {
    expect(routeLocale("/scholarships")).toBeNull();
    expect(routeLocale("/chat")).toBeNull();
  });
});

describe("toggleTarget", () => {
  test("homepage round-trips between / and /bn", () => {
    expect(toggleTarget("/")).toEqual({ href: "/bn", locale: "bn" });
    expect(toggleTarget("/bn")).toEqual({ href: "/", locale: "en" });
    expect(toggleTarget("/bn/")).toEqual({ href: "/", locale: "en" });
  });

  test("non-localized pages have no URL target", () => {
    expect(toggleTarget("/scholarships")).toBeNull();
    expect(toggleTarget("/guide/ielts")).toBeNull();
  });
});

describe("isBnPath", () => {
  test("matches the /bn prefix only", () => {
    expect(isBnPath("/bn")).toBe(true);
    expect(isBnPath("/bn/foo")).toBe(true);
    expect(isBnPath("/bng")).toBe(false);
    expect(isBnPath("/")).toBe(false);
  });
});
