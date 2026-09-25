/**
 * SHEEN Toolbox 统一打印预览脚本
 * 提供：打印按钮渲染 + 打印预览弹窗 + 打印时间戳
 * 各工具页在 </main> 后调用 initPrintPreview() 即可
 */
(function () {
  'use strict';

  var PAGE_TITLE = document.title || 'SHEEN Toolbox';
  var PRINT_TIME_EL = null;

  /**
   * 初始化打印功能：
   * 1. 在 main 后插入打印预览按钮（无-print 区域）
   * 2. 注入 print-time 元素并设置时间
   * 3. 绑定 ESC 关闭预览弹窗
   */
  window.initPrintPreview = function () {
    var main = document.querySelector('main');
    if (!main) return;

    // 插入打印按钮（页面内容上方，右对齐，仅保留"打印此页"）
    var btnWrap = document.createElement('div');
    btnWrap.className = 'action-row no-print';
    btnWrap.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:16px;flex-wrap:wrap;';
    btnWrap.innerHTML =
      '<button type="button" class="btn-print-flat" onclick="window.print()">' +
        '<i class="fa-solid fa-print"></i> 打印此页' +
      '</button>';
    main.insertBefore(btnWrap, main.firstChild);

    // 注入/补填 print-time
    //   ① 没有该元素 → 创建并插到 .sheen-footer 之后；
    //   ② 有元素但内容为空 → 补填兜底值。
    //   只有「空」才补写，因此永远不会覆盖页面自己生成的时间戳；
    //   safety-signs 等"声明了 div 却没写填值代码"的页面靠这条兜底。
    var pt = document.getElementById('printTime');
    if (!pt) {
      pt = document.createElement('div');
      pt.id = 'printTime';
      pt.className = 'print-time';
      var footer = document.querySelector('.sheen-footer');
      if (footer) {
        footer.parentNode.insertBefore(pt, footer.nextSibling);
      } else {
        document.body.appendChild(pt);
      }
    }
    if (!pt.textContent.trim()) pt.textContent = formatPrintTime();
    PRINT_TIME_EL = pt;
  };

  function formatPrintTime() {
    // 统一按中国时区 (UTC+8) 输出：绝对 +8h 偏移后交给 toISOString 渲染，
    // 任何本机时区下都等于北京时间。
    // ⚠️ 不要写成 `new Date(Date.now() + (480 + getTimezoneOffset()) * 60000)`
    //    再由 toISOString/UTC 分量读取 —— 本机已在 UTC+8 时偏移量正好抵消，
    //    得到的是 UTC，会比北京时间慢 8 小时。
    var d = new Date(Date.now() + 8 * 3600000);
    var pad = function (n) { return n < 10 ? '0' + n : n; };
    return '打印时间：' + d.getUTCFullYear() + '-' +
      pad(d.getUTCMonth() + 1) + '-' +
      pad(d.getUTCDate()) + ' ' +
      pad(d.getUTCHours()) + ':' +
      pad(d.getUTCMinutes()) + ':' +
      pad(d.getUTCSeconds()) + '（北京时间）';
  }
})();
