// SHEEN Toolbox Service Worker v1.0
// 提供基础离线缓存和快速加载

const CACHE_NAME = 'sheen-toolbox-v1';
const ASSETS = [
  '/sheen-toolbox/',
  '/sheen-toolbox/common.css',
  '/sheen-toolbox/assets/icon-192.png',
  '/sheen-toolbox/assets/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// 安装：预缓存核心资源
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// 请求拦截：缓存优先，动态缓存工具页面
self.addEventListener('fetch', function(event) {
  // 跳过非 GET 请求和 chrome-extension
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  // CDN 资源和静态资源：缓存优先
  if (url.hostname === 'cdnjs.cloudflare.com' ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.svg')) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
          return response;
        });
      })
    );
    return;
  }

  // 工具页面和首页：网络优先，失败时回退到缓存
  event.respondWith(
    fetch(event.request).then(function(response) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(event.request, clone);
      });
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        return cached || caches.match('/sheen-toolbox/');
      });
    })
  );
});
