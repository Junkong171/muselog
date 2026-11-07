// Supabase 연결. 키(.env.local / Vercel 환경 변수)가 없으면 authEnabled가 false이고, 앱은 로그인 없이 지금처럼 동작한다.
// 연결 코드가 커서 첫 화면과 따로 나눠 두고, loadSupabase()를 부를 때 불러온다 (한 번 만든 연결을 계속 쓴다).
import { isAuthConfigured } from "./auth";

const env = import.meta.env;

export const authEnabled = isAuthConfigured(env);

let clientPromise = null;
let client = null;

// 이미 불러온 연결 (아직 없으면 null). 로그인한 뒤에 쓰는 일(저장·로그아웃·탈퇴)은 이것을 쓴다
export const getSupabase = () => client;

export function loadSupabase() {
  if (!authEnabled) return Promise.resolve(null);
  clientPromise ??= import("@supabase/supabase-js")
    .then(({ createClient }) => {
      client = createClient(env.VITE_SUPABASE_URL.trim(), env.VITE_SUPABASE_ANON_KEY.trim());
      return client;
    })
    .catch(error => {
      clientPromise = null; // 다음에 다시 시도
      throw error;
    });
  return clientPromise;
}
