// SHEEN Toolbox 全站分享脚本（assets/share.js）
// 供各工具页「分享」按钮调用（shareTool 全局函数）。
// 移动端优先原生分享，桌面端复制链接；toast 提示由本脚本自建，无需页面注入元素。
(function () {
    'use strict';

    var toastEl = null;

    function showToast(msg) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.style.cssText = 'position:fixed;bottom:148px;right:24px;z-index:99;' +
                'background:rgba(30,33,38,0.92);color:#fff;font-size:13px;padding:10px 16px;' +
                'border-radius:10px;opacity:0;pointer-events:none;transform:translateY(8px);' +
                'transition:all .25s ease;max-width:260px;font-family:var(--font,sans-serif);';
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = msg;
        toastEl.style.opacity = '1';
        toastEl.style.transform = 'translateY(0)';
        clearTimeout(toastEl._t);
        toastEl._t = setTimeout(function () {
            toastEl.style.opacity = '0';
            toastEl.style.transform = 'translateY(8px)';
        }, 2200);
    }

    window.shareTool = function () {
        var url = location.href;
        var title = document.title || 'SHEEN Toolbox';

        // 移动端：原生分享（微信内置浏览器无原生分享时走复制分支）
        if (navigator.share) {
            navigator.share({ title: title, url: url }).catch(function () {});
            return;
        }

        var ok = function (success) {
            showToast(success ? '链接已复制，粘贴到微信即可分享' : '请手动复制地址栏链接分享');
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(
                function () { ok(true); },
                function () { ok(false); }
            );
            return;
        }
        // 降级：隐藏 textarea + execCommand
        var ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { ok(document.execCommand('copy')); } catch (e) { ok(false); }
        document.body.removeChild(ta);
    };
})();
