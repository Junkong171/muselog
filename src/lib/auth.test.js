import { describe, expect, it } from "vitest";
import { authErrorFromUrl, displayName, isAuthConfigured } from "./auth";

describe("isAuthConfigured (Supabase 키 설정 여부)", () => {
  it("주소(https)와 키가 모두 있으면 켠다", () => {
    expect(isAuthConfigured({ VITE_SUPABASE_URL: "https://abc.supabase.co", VITE_SUPABASE_ANON_KEY: "key123" })).toBe(true);
  });

  it("하나라도 없거나 비었거나 https가 아니면 끈다", () => {
    [
      undefined,
      {},
      { VITE_SUPABASE_URL: "https://abc.supabase.co" },
      { VITE_SUPABASE_ANON_KEY: "key123" },
      { VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "key123" },
      { VITE_SUPABASE_URL: "https://abc.supabase.co", VITE_SUPABASE_ANON_KEY: "   " },
      { VITE_SUPABASE_URL: "http://abc.supabase.co", VITE_SUPABASE_ANON_KEY: "key123" },
      { VITE_SUPABASE_URL: "여기에 주소", VITE_SUPABASE_ANON_KEY: "key123" },
    ].forEach(env => {
      expect(isAuthConfigured(env)).toBe(false);
    });
  });
});

describe("displayName (상단 바 이름)", () => {
  it("구글 이름(full_name)을 먼저 쓴다", () => {
    expect(displayName({ email: "a@b.com", user_metadata: { full_name: "문준서", name: "다른 이름" } })).toBe("문준서");
  });

  it("카카오 닉네임 등 다른 이름 항목도 쓴다", () => {
    expect(displayName({ user_metadata: { nickname: "준서" } })).toBe("준서");
    expect(displayName({ user_metadata: { preferred_username: " junseo " } })).toBe("junseo");
  });

  it("이름이 없으면 이메일 @ 앞부분", () => {
    expect(displayName({ email: "music.lover@example.com", user_metadata: {} })).toBe("music.lover");
    expect(displayName({ user_metadata: { email: "kakao_user@kakao.com" } })).toBe("kakao_user");
  });

  it("아무것도 없으면 사용자", () => {
    [null, undefined, {}, { user_metadata: { full_name: "  " } }, { email: "@x.com" }].forEach(user => {
      expect(displayName(user)).toBe("사용자");
    });
  });
});

describe("authErrorFromUrl (로그인 실패하고 돌아왔을 때)", () => {
  it("오류가 없으면 주소 그대로", () => {
    expect(authErrorFromUrl("http://localhost:5173/")).toEqual({ hasError: false, cleanUrl: "http://localhost:5173/" });
  });

  it("? 뒤의 오류를 알아채고 지운다", () => {
    const result = authErrorFromUrl("http://localhost:5173/?error=access_denied&error_description=User+cancelled");
    expect(result).toEqual({ hasError: true, cleanUrl: "http://localhost:5173/" });
  });

  it("# 뒤의 오류도 알아채고, 다른 값은 남긴다", () => {
    const result = authErrorFromUrl(
      "https://muselog-swart.vercel.app/?tab=1#error=server_error&error_code=500&error_description=oops&keep=yes",
    );
    expect(result).toEqual({ hasError: true, cleanUrl: "https://muselog-swart.vercel.app/?tab=1#keep=yes" });
  });
});
