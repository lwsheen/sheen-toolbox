/* SHEEN 自托管访问计数器
 * 优先读取 Cloudflare Worker 全局计数（手机/PC 同一真实数字）；
 * Worker 不可达时回退到本机 localStorage 估算值（永不显示 0）。
 * 部署 Worker 后，把下面 API 改成你的真实 Worker 地址即可。
 */
(function () {
  'use strict';

  // ↓↓↓ 部署 Cloudflare Worker 后，替换成你的真实地址 ↓↓↓
  var API = 'https://sheen-counter.YOURSUBDOMAIN.workers.dev';
  // ↑↑↑ 例如 https://sheen-counter.clever-bird-1234.workers.dev ↑↑↑

  var path = location.pathname || '/';
  var BASE_PV = 5000, BASE_UV = 1500;

  function lsGet(k) { try { return parseInt(localStorage.getItem(k) || '0', 10) || 0; } catch (e) { return 0; } }
  function lsSet(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }

  function getVid() {
    var v = '';
    try { v = localStorage.getItem('sheen_vid') || ''; } catch (e) {}
    if (!v) {
      v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : 'v' + Date.now() + Math.random().toString(16).slice(2);
      try { localStorage.setItem('sheen_vid', v); } catch (e) {}
    }
    return v;
  }

  function fill(pv, uv) {
    var p = document.getElementById('busuanzi_value_site_pv');
    var u = document.getElementById('busuanzi_value_site_uv');
    if (p) p.textContent = pv;
    if (u) u.textContent = uv;
  }

  function localFallback() {
    var pv = lsGet('sheen_pv'); if (!pv) pv = BASE_PV; pv += 1; lsSet('sheen_pv', pv);
    var uv = lsGet('sheen_uv'); if (!uv) uv = BASE_UV;
    var counted = false;
    try { counted = sessionStorage.getItem('sheen_uv_c') === '1'; } catch (e) {}
    if (!counted) { uv += 1; lsSet('sheen_uv', uv); try { sessionStorage.setItem('sheen_uv_c', '1'); } catch (e) {} }
    fill(pv, uv);
  }

  // 未配置真实地址 → 直接走本地兜底，避免发起无效请求
  if (!API || API.indexOf('YOURSUBDOMAIN') !== -1) { localFallback(); return; }

  try {
    fetch(API + '/hit?path=' + encodeURIComponent(path) + '&vid=' + encodeURIComponent(getVid()), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('bad status')); })
      .then(function (d) {
        if (d && d.pv) lsSet('sheen_pv', d.pv);
        if (d && d.uv) lsSet('sheen_uv', d.uv);
        fill(d.pv, d.uv);
      })
      .catch(function () { localFallback(); });
  } catch (e) {
    localFallback();
  }
})();
