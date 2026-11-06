import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("public/licenses.html", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

describe("출처·라이선스 페이지 (licenses.html)", () => {
  it("앱에 들어가는 라이브러리(dependencies)를 모두 적어 둔다", () => {
    Object.keys(pkg.dependencies).forEach(name => {
      expect(page, `${name}이(가) licenses.html에 없어요`).toContain(`<code>${name}</code>`);
    });
  });

  it("적어 둔 버전이 설치된 라이브러리 버전과 같다", () => {
    Object.keys(pkg.dependencies).forEach(name => {
      const installed = JSON.parse(readFileSync(`node_modules/${name}/package.json`, "utf8")).version;
      expect(page).toContain(`<code>${name}</code></td><td>${installed}</td>`);
    });
  });

  it("표에 적은 모든 라이브러리(딸려 들어오는 것 포함)의 버전이 설치된 버전과 같다", () => {
    const rows = [...page.matchAll(/<code>([^<]+)<\/code><\/td><td>([^<]+)<\/td>/g)];
    expect(rows.length).toBeGreaterThanOrEqual(12);
    rows.forEach(([, name, version]) => {
      const installed = JSON.parse(readFileSync(`node_modules/${name}/package.json`, "utf8")).version;
      expect(version, `${name} 버전이 달라요`).toBe(installed);
    });
  });

  it("음원·글꼴 출처와 라이선스 전문을 담는다", () => {
    ["FluidR3 GM", "Frank Wen", "CC BY 3.0", "midi-js-soundfonts", "Noto Sans KR", "DM Sans", "SIL Open Font License 1.1"].forEach(text => {
      expect(page).toContain(text);
    });
    expect(page).toContain("Permission is hereby granted, free of charge");
    expect(page).toContain("Permission to use, copy, modify, and/or distribute this software");
  });
});
