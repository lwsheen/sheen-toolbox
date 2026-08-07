/* SHEEN Toolbox — 自建访问计数器（前端）
 * 数据来自你自己的云函数（腾讯云 SCF / 阿里云 FC），数字准确、自主可控。
 * 百度统计继续在后台看真实分析，此处仅做前台展示。
 *
 * ★ 部署后请把 COUNTER_API 改成你的 API 网关地址（留空则不显示，页面无影响）。
 */
(function () {
  // ===== 配置：你的云函数 API 网关地址 =====
  var COUNTER_API = ''; // 例：https://xxx.apigw.tencentcs.com/release/counter
  // =========================================

  if (!COUNTER_API) return; // 未配置则不显示，页面正常运行

  var el = document.getElementById('siteCounter');
  if (!el) return;

  function fmt(n) {
    try { return (n || 0).toLocaleString('zh-CN'); }
    catch (e) { return String(n || 0); }
  }

  fetch(COUNTER_API + '?path=home&_=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && typeof d.pv !== 'undefined') {
        el.innerHTML = '全站访问 <b>' + fmt(d.pv) + '</b> 次 · 独立访客 <b>' + fmt(d.uv) + '</b> 人';
        el.style.display = '';
      }
    })
    .catch(function () { /* 静默失败，不显示计数，不影响页面 */ });
})();
