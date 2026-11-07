import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { isAuthConfigured } from './src/lib/auth.js'

// 나눠 불러오는 파일(탭 화면·로그인 연결)을 첫 화면(index.html)에 "미리 받기"로 적는다.
// 브라우저가 첫 화면을 띄운 뒤 받아 두고, 오프라인 저장(public/sw.js)도 이 목록을 보고 모두 저장한다.
// 로그인 키가 없으면 로그인 연결 파일은 쓰지 않으니 적지 않는다.
function prefetchSplitFiles(authEnabled) {
  return {
    name: 'muselog-prefetch-split-files',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html
        const isAuthOnly = file => file.type === 'chunk' && file.moduleIds.some(id => id.includes('@supabase'))
        return Object.values(ctx.bundle)
          .filter(file => /\.(js|css)$/.test(file.fileName) && !html.includes(`/${file.fileName}"`))
          .filter(file => authEnabled || !isAuthOnly(file))
          .map(file => ({ tag: 'link', attrs: { rel: 'prefetch', href: `/${file.fileName}` }, injectTo: 'head' }))
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), prefetchSplitFiles(isAuthConfigured(loadEnv(mode, process.cwd())))],
}))
