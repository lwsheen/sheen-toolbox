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

    // —— 全局默认免责声明注入 ——
    // 仅当页面正文未自带免责内容时注入，避免与已有免责声明重复。
    // 判据：正文文本含「免责 / Disclaimer / 仅供参考 / 不构成」即视为已有，跳过。
    function ensureDisclaimer() {
        try {
            if (document.querySelector('[data-sheen-disc]')) return;            // 已注入，跳过
            var bodyText = (document.body && document.body.innerText) || '';
            if (/免责声明|免责|Disclaimer|仅供参考|不构成/.test(bodyText)) return; // 已有免责，跳过

            var disc = document.createElement('section');
            disc.className = 'sheen-disc';
            disc.setAttribute('data-sheen-disc', '1');
            disc.innerHTML = '<i class="fa-solid fa-circle-info"></i> <strong>免责声明：</strong>' +
                '本工具依据公开国家标准、行业规范及官方文件整理，仅供参考与内部初步筛查之用，' +
                '不构成任何专业法律、安全或工程意见。实际合规判定请以最新官方发布文本及具备资质的专业机构评估为准。' +
                '使用者应自行核实相关标准的现行有效性。';

            // 挂载点优先级：静态 footer 之前（footer 不会被页面 JS 重建，最稳）>
            // main 末尾 > body 末尾。
            var footer = document.querySelector('.sheen-footer');
            if (footer && footer.parentNode) {
                footer.parentNode.insertBefore(disc, footer);
            } else {
                var mount = document.querySelector('main') || document.querySelector('.content-area');
                if (mount) {
                    mount.appendChild(disc);
                } else {
                    document.body.appendChild(disc);
                }
            }
        } catch (e) { /* 静默失败，不阻塞页面 */ }
    }

    // —— 全局静态分享按钮（非悬浮，置于「标准块 .tool-meta」上方、页面居中）——
    // 仅当页面未自带分享按钮时注入，避免与页内已有「分享」按钮重复。
    function ensureShareBtn() {
        try {
            if (document.querySelector('.share-action')) return;                                 // 已注入，跳过
            if (document.querySelector('.fa-share, .fa-share-nodes, [onclick*="shareTool"]')) return; // 页内已有分享按钮，跳过

            var wrap = document.createElement('div');
            wrap.className = 'share-action';
            var btn = document.createElement('button');
            btn.className = 'btn btn-outline';
            btn.innerHTML = '<i class="fa-solid fa-share-nodes"></i> 分享';
            btn.addEventListener('click', function () {
                if (typeof window.shareTool === 'function') window.shareTool();
            });
            wrap.appendChild(btn);

            // 挂载点优先级：标准块 .tool-meta 之前（置于标准号信息上方）>
            // 静态 footer 之前 > main 末尾 > body 末尾（兜底无 .tool-meta 的页）。
            var tm = document.querySelector('.tool-meta');
            if (tm && tm.parentNode) {
                tm.parentNode.insertBefore(wrap, tm);
            } else {
                var footer = document.querySelector('.sheen-footer');
                if (footer && footer.parentNode) {
                    footer.parentNode.insertBefore(wrap, footer);
                } else {
                    var mount = document.querySelector('main') || document.querySelector('.content-area');
                    if (mount) mount.appendChild(wrap);
                    else document.body.appendChild(wrap);
                }
            }
        } catch (e) { /* 静默失败，不阻塞页面 */ }
    }

    function initEnhancements() {
        function run() {
            ensureDisclaimer();
            ensureShareBtn();
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run);
        } else {
            run();
        }
    }
    initEnhancements();
})();
