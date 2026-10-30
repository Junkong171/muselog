// Supabase 연결. 키(.env.local / Vercel 환경 변수)가 없으면 null이고, 앱은 로그인 없이 지금처럼 동작한다.
import { createClient } from "@supabase/supabase-js";
import { isAuthConfigured } from "./auth";

const env = import.meta.env;

export const supabase = isAuthConfigured(env)
  ? createClient(env.VITE_SUPABASE_URL.trim(), env.VITE_SUPABASE_ANON_KEY.trim())
  : null;
