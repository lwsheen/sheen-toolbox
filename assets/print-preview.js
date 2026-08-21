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

    // 插入打印按钮（页面内容上方）
    var btnWrap = document.createElement('div');
    btnWrap.className = 'action-row no-print';
    btnWrap.style.cssText = 'display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;';
    btnWrap.innerHTML =
      '<button type="button" class="btn-print" onclick="window.print()">' +
        '<i class="fa-solid fa-print"></i> 打印此页' +
      '</button>' +
      '<button type="button" class="btn-outline btn-sm" onclick="openPrintPreview()">' +
        '<i class="fa-solid fa-eye"></i> 预览' +
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

    // ESC 关闭预览
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePrintPreview();
    });
  };

  /**
   * 打开打印预览弹窗（新建窗口预览打印效果）
   */
  window.openPrintPreview = function () {
    var previewWin = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    if (!previewWin) {
      alert('请允许弹出窗口以查看打印预览');
      return;
    }
    var content = document.documentElement.innerHTML;
    var cssLinks = '';
    var styles = document.querySelectorAll('link[rel="stylesheet"], style');
    styles.forEach(function (s) {
      if (s.href) cssLinks += '<link rel="stylesheet" href="' + s.href + '">\n';
      else cssLinks += s.outerHTML + '\n';
    });
    var scripts = [];
    document.querySelectorAll('script').forEach(function (s) {
      if (s.src) scripts.push('<script src="' + s.src + '"></script>');
      else if (s.textContent) scripts.push('<script>' + s.textContent + '</script>');
    });
    // 移除打印按钮和时间戳
    var bodyContent = content.replace(/<div[^>]*class="[^"]*action-row[^"]*"[^>]*>[\s\S]*?<\/div>/g, '')
                              .replace(/<div[^>]*id="printTime"[^>]*>[\s\S]*?<\/div>/g, '');
    previewWin.document.open();
    previewWin.document.write(
      '<!DOCTYPE html>' +
      '<html lang="zh-CN">' +
      '<head>' +
      '<meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>打印预览 - ' + PAGE_TITLE + '</title>' +
      cssLinks +
      '<style>' +
      '@media print {' +
      '  .no-print, .print-btn, #printTime { display: none !important; }' +
      '  body { background: #fff; color: #000; font-size: 12pt; }' +
      '  .data-table, .dt { width: 100% !important; table-layout: fixed !important; font-size: 9pt !important; }' +
      '  .data-table th, .data-table td, .dt th, .dt td { padding: 3px 5px !important; word-wrap: break-word !important; }' +
      '  .chem-table, .chem-table-wrap { min-width: 0 !important; overflow-x: visible !important; }' +
      '}' +
      '</style>' +
      '</head>' +
      '<body>' +
      bodyContent +
      '<div class="print-time" id="printTime" style="display:block;text-align:right;font-size:10pt;color:#666;margin-top:20px;">' + formatPrintTime() + '</div>' +
      scripts.join('\n') +
      '<script>' +
      '  window.onload = function() { setTimeout(function(){ window.print(); }, 300); }' +
      '</script>' +
      '</body></html>'
    );
    previewWin.document.close();
  };

  window.closePrintPreview = function () {
    // 无弹窗时可扩展
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
