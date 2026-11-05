import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));

function pngSize(path) {
  const file = readFileSync(path);
  return `${file.readUInt32BE(16)}x${file.readUInt32BE(20)}`;
}

describe("앱 설치 정보 (manifest)", () => {
  it("이름, 시작 주소, 전체 화면 표시를 담는다", () => {
    expect(manifest.name).toBe("MUSELOG");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
  });

  it("192px, 512px, 가장자리가 잘려도 되는 512px 아이콘을 담는다", () => {
    const icons = manifest.icons.map(icon => `${icon.sizes} ${icon.purpose}`);
    expect(icons).toEqual(["192x192 any", "512x512 any", "512x512 maskable"]);
  });

  it("아이콘 파일이 있고 적어 둔 크기와 같다", () => {
    manifest.icons.forEach(icon => {
      const path = `public${icon.src}`;
      expect(existsSync(path)).toBe(true);
      expect(pngSize(path)).toBe(icon.sizes);
    });
  });
});
