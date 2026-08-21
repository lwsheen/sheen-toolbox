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

    // 注入 print-time
    if (!document.getElementById('printTime')) {
      var pt = document.createElement('div');
      pt.id = 'printTime';
      pt.className = 'print-time';
      pt.textContent = formatPrintTime();
      var footer = document.querySelector('.sheen-footer');
      if (footer) {
        footer.parentNode.insertBefore(pt, footer.nextSibling);
      } else {
        document.body.appendChild(pt);
      }
    }
    PRINT_TIME_EL = document.getElementById('printTime');
  };

  function formatPrintTime() {
    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : n; };
    return d.getFullYear() + '-' +
      pad(d.getMonth() + 1) + '-' +
      pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' +
      pad(d.getMinutes()) + ':' +
      pad(d.getSeconds()) + ' (UTC+8)';
  }
})();
