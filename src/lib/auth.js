// 로그인 관련 계산 (순수 함수). 실제 로그인은 supabase.js의 클라이언트로 한다.

// Supabase 키가 둘 다 있고 주소가 https일 때만 로그인을 켠다. 없으면 앱은 로그인 없이 동작한다
export function isAuthConfigured(env) {
  const url = env?.VITE_SUPABASE_URL;
  const key = env?.VITE_SUPABASE_ANON_KEY;
  return typeof url === "string" && /^https:\/\/\S+$/.test(url.trim()) && typeof key === "string" && key.trim() !== "";
}

// 상단 바에 보일 이름: 계정 이름(구글 이름, 카카오 닉네임) → 이메일 @ 앞부분 → "사용자"
export function displayName(user) {
  const meta = user?.user_metadata ?? {};
  const name = [meta.full_name, meta.name, meta.nickname, meta.preferred_username, meta.user_name]
    .find(value => typeof value === "string" && value.trim());
  if (name) return name.trim();
  const email = typeof user?.email === "string" ? user.email : meta.email;
  if (typeof email === "string" && email.includes("@") && email.split("@")[0]) return email.split("@")[0];
  return "사용자";
}

// 로그인 화면에서 취소하거나 오류가 나서 돌아오면 주소에 error=…가 붙는다 (? 뒤나 # 뒤).
// 오류가 있었는지와, 오류 글자를 뺀 주소를 돌려준다
export function authErrorFromUrl(href) {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const hasError = url.searchParams.has("error") || hash.has("error");
  if (!hasError) return { hasError: false, cleanUrl: href };
  ["error", "error_code", "error_description"].forEach(name => {
    url.searchParams.delete(name);
    hash.delete(name);
  });
  const rest = hash.toString();
  url.hash = rest ? `#${rest}` : "";
  return { hasError: true, cleanUrl: url.toString() };
}
