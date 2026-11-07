/*!
 * SHEEN Toolbox —— 全站 AI 请求代理端点（唯一来源）
 *
 * 用途：5 个 AI 工具页（5Why / 环境因素 / JSA+LEC / 法规问答 / PSSR）
 *      统一经由 Cloudflare Pages Function /api/llm-chat-v2 转发智谱，
 *      不再从浏览器直连 open.bigmodel.cn（直连必然 CORS 预检失败）。
 *
 * 为什么用绝对地址：github.io 是纯静态镜像，没有 Functions；
 *      相对路径会打到 github.io 上 404，因此两个镜像都必须指向 CF 主站，
 *      由 Function 的 CORS 白名单放行 github.io 来源。
 *
 * 本地验证覆盖（不影响线上）：
 *      window.SHEEN_AI_PROXY_URL = 'http://127.0.0.1:8788/...'  （最高优先级）
 *  或  localStorage['sheen_ai_proxy_url'] = '...'
 *
 * 用法：
 *      var r = window.SHEEN_AI.resolve({ mode:'own', key:'xxx.yyy', proxyUrl:'' });
 *      fetch(r.url, { method:'POST', headers:r.headers, body: ... });
 */
(function (w) {
  'use strict';

  var DEFAULT_ENDPOINT = 'https://lwsheen.pages.dev/sheen-toolbox/api/llm-chat-v2';
  var LS_KEY = 'sheen_ai_proxy_url';

  function endpoint() {
    if (w.SHEEN_AI_PROXY_URL) return String(w.SHEEN_AI_PROXY_URL);
    try {
      var v = w.localStorage && w.localStorage.getItem(LS_KEY);
      if (v) return String(v);
    } catch (e) { /* 隐私模式禁用 localStorage */ }
    return DEFAULT_ENDPOINT;
  }

  /** 判断是否为本站代理（老配置里可能已填了本站地址，不能当第三方代理处理） */
  function isSiteEndpoint(u) {
    return /\/api\/llm-chat-v2\/?$/i.test(String(u || ''));
  }

  /**
   * 由各页原有的 {mode, key, proxyUrl} 配置，解析出最终 URL 与请求头。
   * - own   ：送 X-Zhipu-Key，Function 用用户自有 Key 转发
   * - proxy ：不送 Key，Function 用服务端共享密钥（免 Key）
   * - 用户显式填了第三方代理地址：保持旧行为，不经本站 Function（兼容老配置）
   */
  function resolve(cfg) {
    cfg = cfg || {};
    var mode = cfg.mode === 'proxy' ? 'proxy' : 'own';
    var key = String(cfg.key || '').trim();
    var custom = String(cfg.proxyUrl || '').trim();

    if (mode === 'proxy' && custom && !isSiteEndpoint(custom)) {
      return { url: custom, headers: { 'Content-Type': 'application/json' }, via: 'custom' };
    }

    var headers = { 'Content-Type': 'application/json' };
    if (mode === 'own' && key) headers['X-Zhipu-Key'] = key;
    return {
      url: endpoint(),
      headers: headers,
      via: mode === 'own' ? 'own' : 'shared'
    };
  }

  w.SHEEN_AI = {
    ENDPOINT: DEFAULT_ENDPOINT,
    endpoint: endpoint,
    isSiteEndpoint: isSiteEndpoint,
    resolve: resolve
  };
})(window);
