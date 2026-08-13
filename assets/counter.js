/* SHEEN Toolbox — 不蒜子 busuanzi 统计 + 本地兜底 + 累加基数
 * 优先使用官方不蒜子脚本（index.html body 末尾 async 引入），
 * 显示数字 = 官方实时数 + BASE（累加基数），让之前积累的访问量接续显示。
 * 若 CDN 被拦/加载失败（如鸿蒙浏览器偶发），轮询超时后回退到本机
 * localStorage 估算值（sheen_pv/sheen_uv, 同样从 BASE 起算），
 * 保证首页 footer 访问统计始终可见、永不显示 0。
 */
(function () {
  'use strict';

  // ↓↓↓ 累加基数：把之前积累的访问量接续上来（可随时改）↓↓↓
  var BASE_PV = 2000, BASE_UV = 500;
  // ↑↑↑ 官方实时数 + 基数 = 页面显示数，例如官方 4 → 显示 2004，官方 UV 2 → 显示 502 ↑↑↑

  function lsGet(k) { try { return parseInt(localStorage.getItem(k) || '0', 10) || 0; } catch (e) { return 0; } }
  function lsSet(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }

  function fmt(n) {
    try { return (n || 0).toLocaleString('zh-CN'); }
    catch (e) { return String(n || 0); }
  }

  // 官方脚本已成功填充？(busuanzi 脚本会把数字写进这两个元素)
  function officialFilled() {
    var p = document.getElementById('busuanzi_value_site_pv');
    var u = document.getElementById('busuanzi_value_site_uv');
    if (p && p.textContent && p.textContent.trim()) return true;
    if (u && u.textContent && u.textContent.trim()) return true;
    return false;
  }

  function fill(pv, uv) {
    var p = document.getElementById('busuanzi_value_site_pv');
    var u = document.getElementById('busuanzi_value_site_uv');
    var cp = document.getElementById('busuanzi_container_site_pv');
    var cu = document.getElementById('busuanzi_container_site_uv');
    if (p) p.textContent = fmt(pv);
    if (u) u.textContent = fmt(uv);
    if (cp) cp.style.display = 'inline';
    if (cu) cu.style.display = 'inline';
  }

  // 官方已填充：读取官方值 + 累加基数
  function applyBase() {
    var p = document.getElementById('busuanzi_value_site_pv');
    var u = document.getElementById('busuanzi_value_site_uv');
    var pv = 0, uv = 0;
    if (p) { var n = parseInt(String(p.textContent).replace(/[^\d]/g, ''), 10); if (!isNaN(n)) pv = n; }
    if (u) { var m = parseInt(String(u.textContent).replace(/[^\d]/g, ''), 10); if (!isNaN(m)) uv = m; }
    fill(pv + BASE_PV, uv + BASE_UV);
  }

  function localFallback() {
    // 若此刻官方已填充（轮询间隙完成的），仍走加基数路径
    if (officialFilled()) { applyBase(); return; }
    var pv = lsGet('sheen_pv'); if (!pv) pv = BASE_PV; pv += 1; lsSet('sheen_pv', pv);
    var uv = lsGet('sheen_uv'); if (!uv) uv = BASE_UV;
    var counted = false;
    try { counted = sessionStorage.getItem('sheen_uv_c') === '1'; } catch (e) {}
    if (!counted) { uv += 1; lsSet('sheen_uv', uv); try { sessionStorage.setItem('sheen_uv_c', '1'); } catch (e) {} }
    fill(pv, uv);
  }

  // 轮询等待官方脚本填充（每 500ms 一次，最多 10 秒）；
  // 填充成功 → 官方值 + 基数显示；超时 → 本地兜底
  var tries = 0;
  function poll() {
    tries++;
    if (officialFilled()) { applyBase(); return; }
    if (tries >= 20) { localFallback(); return; }
    setTimeout(poll, 500);
  }
  setTimeout(poll, 800);
})();
