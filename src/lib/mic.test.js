import { describe, expect, it } from "vitest";
import { micErrorMessage } from "./mic";

const named = name => ({ name });

describe("micErrorMessage (마이크 안내 문구)", () => {
  it("권한이 막히면 브라우저에서는 주소창 자물쇠를 안내한다", () => {
    const text = "마이크 사용이 허락되지 않았어요. 주소창 왼쪽 자물쇠에서 마이크를 허용해 주세요.";
    expect(micErrorMessage(named("NotAllowedError"))).toBe(text);
    expect(micErrorMessage(named("SecurityError"), false)).toBe(text);
  });

  it("설치한 앱에서는 브라우저 설정의 사이트 권한을 안내한다", () => {
    ["NotAllowedError", "SecurityError"].forEach(name => {
      expect(micErrorMessage(named(name), true)).toBe(
        "마이크 사용이 허락되지 않았어요. 이 앱을 설치한 브라우저(삼성 인터넷·Chrome 등)의 설정 → 사이트 권한 → 마이크에서 허용하고, 앱을 다시 열어 주세요. 휴대폰 설정에서 그 브라우저의 마이크 권한도 확인해 주세요.",
      );
    });
  });

  it("마이크가 없을 때와 그 밖의 오류는 앱·브라우저 모두 같은 문구", () => {
    [false, true].forEach(installed => {
      expect(micErrorMessage(named("NotFoundError"), installed)).toBe("마이크를 찾지 못했어요. 마이크가 연결되어 있는지 확인해 주세요.");
      expect(micErrorMessage(named("OverconstrainedError"), installed)).toBe("마이크를 찾지 못했어요. 마이크가 연결되어 있는지 확인해 주세요.");
      expect(micErrorMessage(named("NotReadableError"), installed)).toBe("마이크를 켜지 못했어요. 다른 앱이 마이크를 쓰고 있지 않은지 확인해 주세요.");
      expect(micErrorMessage(undefined, installed)).toBe("마이크를 켜지 못했어요. 다른 앱이 마이크를 쓰고 있지 않은지 확인해 주세요.");
    });
  });
});
