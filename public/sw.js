// 인터넷 없이도 앱이 열리게 앱 파일과 들어 본 음원을 저장한다.
// 연습 기록은 여기에 넣지 않는다 (localStorage에 있다). 다른 사이트 요청(Supabase, 글꼴 등)은 건드리지 않는다.
const APP_CACHE = "muselog-app-v1";
const SOUND_CACHE = "muselog-sounds-v1";
const STATIC_FILES = [
  "/manifest.webmanifest",
  "/favicon.svg",
  "/logo.svg",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

function assetPaths(html) {
  return [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => match[1]);
}

// 앱 첫 화면과 그 화면이 쓰는 파일을 저장하고, 이제 쓰지 않는 옛 버전 파일은 지운다
async function storeApp(response) {
  const html = await response.clone().text();
  const assets = assetPaths(html);
  if (assets.length === 0) return;
  const cache = await caches.open(APP_CACHE);
  await cache.addAll(assets);
  await cache.put("/", response);
  const keys = await cache.keys();
  await Promise.all(
    keys
      .filter(request => {
        const { pathname } = new URL(request.url);
        return pathname.startsWith("/assets/") && !assets.includes(pathname);
      })
      .map(request => cache.delete(request)),
  );
}

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const response = await fetch("/", { cache: "reload" });
      if (!response.ok) throw new Error("앱 첫 화면을 받지 못했어요");
      await storeApp(response);
      const cache = await caches.open(APP_CACHE);
      await cache.addAll(STATIC_FILES);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key.startsWith("muselog-") && key !== APP_CACHE && key !== SOUND_CACHE)
          .map(key => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// 화면 열기: 항상 인터넷의 최신 화면을 먼저 쓰고, 끊겼을 때만 저장한 화면을 쓴다
async function openPage(event, url) {
  const isApp = url.pathname === "/";
  try {
    const response = await fetch(event.request);
    if (response.ok && !response.redirected) {
      if (isApp) {
        event.waitUntil(storeApp(response.clone()).catch(() => {}));
      } else if (url.pathname === "/privacy.html") {
        const copy = response.clone();
        event.waitUntil(caches.open(APP_CACHE).then(cache => cache.put("/privacy.html", copy)));
      }
    }
    return response;
  } catch (error) {
    const saved = await caches.match(isApp ? "/" : url.pathname);
    if (saved) return saved;
    throw error;
  }
}

// 파일 이름이 바뀌지 않으면 내용도 그대로인 파일: 저장한 것을 먼저 쓴다
async function savedFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  // ignoreVary: 서버가 "Vary: Origin"을 보내도, 저장한 파일을 다른 요청 방식에서 찾을 수 있게 한다
  const saved = await cache.match(request, { ignoreVary: true });
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const saved = await caches.match(request, { ignoreVary: true });
    if (saved) return saved;
    throw error;
  }
}

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(openPage(event, url));
  } else if (url.pathname.startsWith("/assets/")) {
    event.respondWith(savedFirst(request, APP_CACHE));
  } else if (url.pathname.startsWith("/sounds/")) {
    event.respondWith(savedFirst(request, SOUND_CACHE));
  } else if (STATIC_FILES.includes(url.pathname)) {
    event.respondWith(networkFirst(request));
  }
});
