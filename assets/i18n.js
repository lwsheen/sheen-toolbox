/* ============================================================
   SHEEN Toolbox 共享 i18n 引擎
   - 读取 localStorage.sheen_lang（由首页语言切换写入）
   - 工具分页加载时自动套用英文（标题/副标题/面包屑/页脚/通用标签）
   - 在工具页面包屑注入语言切换按钮，与首页共用 localStorage，保持同步
   - 【正文翻译】各工具页在 </body> 前注入：
       window.__I18N_BODY__ = window.__I18N_BODY__ || {};
       Object.assign(window.__I18N_BODY__, { "中文短语": "English phrase", ... });
     引擎对 body 内每一个文本节点做精确匹配翻译，并用 MutationObserver
     覆盖 JS 动态渲染产生的文本；切回中文时按 node.__zh 原样还原。
   - 纯前端、零依赖；try/catch 包裹，翻译异常绝不破坏页面
   部署路径：/sheen-toolbox/assets/i18n.js
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. 各工具英文标题/简介（与首页 I18N 词典同源） ---------- */
  var PAGE_TITLES = {
    'pssr-checklist': { t: 'PSSR Pre-Startup Safety Review Checklist', d: 'Enhanced multi-industry checklist' },
    'eyewash': { t: 'Eyewash Parameters & Checklist', d: 'GB 38144-2025 lookup + on-site inspection' },
    'fire-extinguisher': { t: 'Fire Extinguisher Tools', d: 'Config calc GB 50140 · vehicle GB 7258/34655' },
    'safety-production-cost-calculator': { t: 'Work Safety Investment Calculator', d: 'Per Caiqi [2022] No.136' },
    'safety-days-calculator': { t: 'Accident-Free Days Calculator', d: 'Consecutive incident-free days & milestones' },
    'work-injury-calculator': { t: 'Work Injury Compensation Calculator', d: 'Estimate per Work Injury Insurance Regulation' },
    'jsa-lec': { t: 'JSA + LEC Risk Analysis', d: 'Job safety analysis + risk assessment' },
    'industry-classification': { t: 'Industry Classification Lookup', d: 'National economic industry classification' },
    'accident-classification': { t: 'Work Accident Classification Lookup', d: 'GB 6441-2025 accident types & codes' },
    'working-height-classification': { t: 'Work at Height Classification Lookup', d: 'GB 3608-2025 grading & determination' },
    'dangerous-goods-query': { t: 'Dangerous Goods Query', d: '767 dangerous goods lookup' },
    'hazardous-chemicals-query': { t: 'Hazardous Chemicals Query', d: '2830 chemicals lookup' },
    'special-work-query': { t: 'Special Work Catalog & Certificate Verification', d: '3 categories + official cert check' },
    'special-equipment-query': { t: 'Special Equipment Lookup & Determination', d: '8 categories · forklift · myth correction' },
    'hazardous-waste-query': { t: 'Hazardous Waste Query', d: '470 wastes lookup' },
    'illuminance-standard': { t: 'Building Illuminance Standard Lookup', d: '422 GB/T 50034-2024 lux values' },
    'five-why-analysis': { t: '5Why + 5M1E Root Cause Analysis', d: 'AI-guided root cause analysis' },
    'iso14001-environmental-factors': { t: 'ISO 14001 Environmental Aspect Identification', d: 'ISO 14001 EMS' },
    'heat-stress-classification': { t: 'Heat Stress Grading Calculator', d: 'GBZ/T 229.3-2025' },
    'niosh-lifting-calculator': { t: 'NIOSH Lifting Equation Calculator', d: 'RWL + LI risk assessment' },
    'explosion-venting-calculator': { t: 'Explosion Venting Area Calculator', d: 'GB 50016 + EN 14491' },
    'environmental-tax-calculator': { t: 'Environmental Tax Calculator', d: 'Four major pollutant categories' },
    'noise-calculator': { t: 'Noise Calculator', d: 'GBZ/T 229.4' },
    'major-hazard-identification': { t: 'Major Hazard Source Identification', d: 'GB 18218-2018' },
    'fire-separation-distance': { t: 'Building Fire Separation Distance Lookup', d: 'GB 50016-2014' },
    'safety-light-curtain': { t: 'Safety Light Curtain Sizing Calculator', d: 'ISO 13855 safety distance' },
    'lifting-calculator': { t: 'Lifting Operation Calculator', d: 'Load / rigging / boom length' },
    'rope-chain-selector': { t: 'Wire Rope & Lifting Chain Selector', d: 'Condition-based selection / diameter rec.' },
    'power-tool-inspection': { t: 'Portable Power Tool Inspection Record', d: 'GB/T 3787 insulation standard' },
    'electrical-safety-checklist': { t: 'Electrical Safety Checklist', d: 'Nine categories electrical safety check' },
    'harness-inspection': { t: 'Fall Protection Harness Inspection', d: 'Six-component GB 6095 check' },
    'grinder-inspection': { t: 'Grinder Safety Checklist', d: 'Eight-item GB 4674 check' },
    'wire-rope-inspection': { t: 'Wire Rope Safety Checklist', d: '11-item GB/T 5972 check' },
    'chain-inspection': { t: 'Lifting Chain Safety Checklist', d: '9-item GB/T 20946 check' },
    'synthetic-fiber-sling-inspection': { t: 'Synthetic Web Sling Inspection', d: '6-item JB/T 8521 check' },
    'hook-shackle-inspection': { t: 'Hook & Shackle Safety Checklist', d: '6-item GB/T 10051 · JB/T 8112' },
    'portable-ladder-inspection': { t: 'Portable Metal Ladder Checklist', d: 'GB 12142-2025 full-process check' },
    'portable-ladder-params': { t: 'Portable Metal Ladder Design Parameters', d: 'GB 12142-2025 seven types' },
    'fixed-ladder-params': { t: 'Fixed Ladder & Platform Design Parameters', d: 'GB 4053.1/2/3-2025' },
    'oel-query': { t: 'Workplace OEL Lookup', d: 'GBZ 2.1-2019 + amendment: 358 chem · 49 dust · 29 bio' },
    'occupational-disease-query': { t: 'Occupational Disease Catalog Lookup', d: '12 categories · 135 types' },
    'heat-index': { t: 'NWS Heat Index (Apparent Temperature) Lookup', d: 'Temp + humidity → feels-like' },
    'heat-stroke-first-aid': { t: 'Heat Stroke Emergency Treatment', d: 'Select the heat-stroke grade (single choice) the patient belongs to; the tool instantly shows graded cooling and transport steps. Based on GBZ 41-2019.' },
    'chemical-burn-lookup': { t: 'Common Chemical Burn First-Aid Lookup', d: 'Based on <b>GBZ 51-2002 Annex D</b>, search by chemical name or filter by category to view the corresponding <b>cleaner</b> and <b>special treatment plan</b>. Total <b>28</b> common chemicals · <b>6</b> categories. This tool is for on-site preliminary reference only — for severe burns, <b>call 120 immediately</b>.' }
  };

  /* ---------- 2. 通用 UI / 区块标签（精确匹配整段文本后翻译） ---------- */
  var CHROME = {
    '返回首页': 'Home',
    '首页': 'Home',
    '标准': 'Standard',
    '发布': 'Published',
    '实施': 'Effective',
    '更新': 'Updated',
    '更新时间': 'Last Updated',
    '数据更新': 'Data Updated',
    '数据更新时间': 'Data Updated',
    '免责声明': 'Disclaimer',
    '查询': 'Query',
    '计算': 'Calculate',
    '重置': 'Reset',
    '打印': 'Print',
    '导出': 'Export',
    '导出报告': 'Export Report',
    '参数输入': 'Input Parameters',
    '参数': 'Parameters',
    '结果': 'Result',
    '计算结果': 'Calculation Result',
    '结论': 'Conclusion',
    '建议': 'Recommendation',
    '数据来源': 'Source',
    '来源': 'Source',
    '判定依据': 'Criteria',
    '判定标准': 'Criteria',
    '判定': 'Determine',
    '检查项目': 'Check Items',
    '检查': 'Check',
    '使用方法': 'How to Use',
    '使用说明': 'Instructions',
    '示例': 'Example',
    '说明': 'Notes',
    '注意': 'Note',
    '提示': 'Tip',
    '提示：': 'Tip:',
    '相关标准': 'Related Standards',
    '标准依据': 'Standard Basis',
    '相关法规': 'Related Regulations',
    '序号': 'No.',
    '编号': 'No.',
    '名称': 'Name',
    '代码': 'Code',
    '类别': 'Category',
    '等级': 'Level',
    '类型': 'Type',
    '风险': 'Risk',
    '风险等级': 'Risk Level',
    '风险级别': 'Risk Level',
    '措施': 'Measure',
    '搜索': 'Search',
    '筛选': 'Filter',
    '全部': 'All',
    '提交': 'Submit',
    '开始': 'Start',
    '下一步': 'Next',
    '上一步': 'Previous',
    '确定': 'OK',
    '取消': 'Cancel',
    '关闭': 'Close',
    '详情': 'Details',
    '查看详情': 'View Details',
    '添加': 'Add',
    '删除': 'Delete',
    '备注': 'Remarks',
    '单位': 'Unit',
    '数值': 'Value',
    '输入': 'Input',
    '输出': 'Output',
    '评估': 'Assessment',
    '评价': 'Evaluation',
    '分析': 'Analysis',
    '报告': 'Report',
    '简介': 'Overview',
    '概述': 'Overview',
    '定义': 'Definition',
    '范围': 'Scope',
    '依据': 'Basis',
    '公式': 'Formula',
    '计算说明': 'Calculation Notes',
    '参考资料': 'References',
    '参考': 'Reference',
    '版权': 'Copyright',
    '联系': 'Contact',
    '关于': 'About',
    '返回': 'Back'
  };

  /* ---------- 3. 工具正文词典（由各工具页在 </body> 前注入 window.__I18N_BODY__） ---------- */
  var BODY = {};
  try {
    if (window.__I18N_BODY__) {
      for (var bk in window.__I18N_BODY__) {
        if (window.__I18N_BODY__.hasOwnProperty(bk)) BODY[bk] = window.__I18N_BODY__[bk];
      }
    }
  } catch (e) {}

  /* ---------- 工具函数 ---------- */
  function getLang() { try { return localStorage.getItem('sheen_lang') || 'zh'; } catch (e) { return 'zh'; } }

  function slug() {
    var m = location.pathname.match(/\/sheen-toolbox\/([^/]+)\//);
    return m ? m[1] : null;
  }

  // 翻译单个文本节点；en=true 译英，en=false 还原中文（按 node.__zh）
  function translateNode(node, en) {
    try {
      var p = node.parentNode;
      if (!p) return;
      var tag = p.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'OPTION' || tag === 'TITLE' || tag === 'TEXTAREA') return;
      // 已被 data-i18n 管理的元素交由 data-i18n 路径处理
      if (p.getAttribute && p.getAttribute('data-i18n')) return;
      var t = (node.nodeValue || '').trim();
      if (!t) return;
      var target = (BODY[t] != null) ? BODY[t] : (CHROME[t] != null ? CHROME[t] : null);
      if (target == null) return;
      if (!node.__zh) node.__zh = node.nodeValue;
      node.nodeValue = en ? target : node.__zh;
    } catch (e) {}
  }

  function translateAll(en) {
    if (!document.createTreeWalker) return;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while ((node = walker.nextNode())) translateNode(node, en);
  }

  // 监听动态渲染：childList（新增/替换节点）才翻译，避免还原中文时回环
  function observeDynamic() {
    if (!('MutationObserver' in window) || !document.body) return;
    var mo = new MutationObserver(function (muts) {
      var en = (getLang() === 'en');
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type !== 'childList') continue;
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (n.nodeType === 3) { translateNode(n, en); }
          else if (n.nodeType === 1) {
            if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE') continue;
            if (!document.createTreeWalker) continue;
            var tw = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, null, false);
            var tn; while ((tn = tw.nextNode())) translateNode(tn, en);
          }
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  var ORIG_TITLE = document.title;

  function apply(lang) {
    try {
      var en = (lang === 'en');
      var s = slug();
      var pt = s ? PAGE_TITLES[s] : null;

      document.documentElement.lang = en ? 'en' : 'zh-CN';

      // 文档标题
      document.title = en ? (pt ? pt.t + ' — SHEEN Toolbox' : ORIG_TITLE) : ORIG_TITLE;

      // 页面主标题（仅翻译首个文本节点，保留末尾图标 <i>）
      var h1 = document.querySelector('.page-title');
      if (pt && h1) {
        for (var hi = 0; hi < h1.childNodes.length; hi++) {
          var hn = h1.childNodes[hi];
          if (hn.nodeType === 3 && hn.textContent.trim()) {
            if (!hn.__zh) hn.__zh = hn.nodeValue;
            hn.nodeValue = en ? pt.t : hn.__zh;
            break;
          }
        }
      }
      // 页面副标题（保留内部 <b> 等标记，用 innerHTML 存取）
      var sub = document.querySelector('.page-subtitle');
      if (pt && sub) {
        if (!sub.dataset.zhHtml) sub.dataset.zhHtml = sub.innerHTML;
        sub.innerHTML = en ? pt.d : sub.dataset.zhHtml;
      }

      // 面包屑：返回首页 + 当前工具名
      var bc = document.querySelector('.breadcrumb');
      if (bc) {
        var a = bc.querySelector('a');
        if (a) {
          for (var i = 0; i < a.childNodes.length; i++) {
            var n = a.childNodes[i];
            if (n.nodeType === 3 && n.textContent.trim() === '返回首页') {
              if (!a.dataset.zh) a.dataset.zh = n.textContent;
              n.textContent = en ? 'Home' : a.dataset.zh;
            }
          }
        }
        var span = bc.querySelector('span');
        if (span) {
          if (!span.dataset.zh) span.dataset.zh = span.textContent;
          span.textContent = en ? (' / ' + (pt ? pt.t : '')) : span.dataset.zh;
        }
      }

      // 页脚：保留 logo + SHEEN Toolbox，替换工具中文名
      var foot = document.querySelector('.sheen-footer');
      if (foot) {
        var html = foot.innerHTML;
        var idx = html.indexOf('·');
        if (idx >= 0) {
          var before = html.slice(0, idx + 1);
          if (!foot.dataset.zh) foot.dataset.zh = html.slice(idx + 1).replace(/^\s+/, '');
          foot.innerHTML = before + ' ' + (en ? (pt ? pt.t : '') : foot.dataset.zh);
        }
      }

      // 正文 + 通用标签翻译（精确匹配；动态内容由 observer 覆盖）
      translateAll(en);

      // 页面自定义词典（data-i18n 属性，key→{en} 或 key→en）
      if (window.TOOL_I18N) {
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
          var k = el.getAttribute('data-i18n');
          var v = window.TOOL_I18N[k];
          if (!v) return;
          if (!el.dataset.zh) el.dataset.zh = el.textContent;
          el.textContent = en ? (v.en || v.zh || el.dataset.zh) : el.dataset.zh;
        });
      }

      // 切换按钮文案
      var tg = document.getElementById('langToggle');
      if (tg) tg.textContent = en ? '中' : 'EN';
    } catch (e) {
      /* 翻译异常绝不破坏页面 */
      if (window.console) console.warn('[i18n] apply failed:', e);
    }
  }

  function injectToggle() {
    if (document.getElementById('langToggle')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'langToggle';
    btn.className = 'lang-toggle';
    btn.setAttribute('aria-label', '切换语言 / Switch language');
    var bc = document.querySelector('.breadcrumb');
    if (bc) { bc.appendChild(btn); }
    else if (document.body) { document.body.appendChild(btn); }
    btn.textContent = (getLang() === 'en') ? '中' : 'EN';
    btn.addEventListener('click', function () {
      var next = (getLang() === 'en') ? 'zh' : 'en';
      try { localStorage.setItem('sheen_lang', next); } catch (e) {}
      apply(next);
      // 通知页面自身的动态渲染逻辑重新按语言渲染
      try { window.dispatchEvent(new CustomEvent('sheen:langchange', { detail: { lang: next } })); } catch (e) {}
    });
  }

  function init() {
    injectToggle();
    apply(getLang());
    observeDynamic();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 跨页面同步：首页切换后，本页若已打开也即时响应
  window.addEventListener('storage', function (e) {
    if (e.key === 'sheen_lang') apply(e.newValue || 'zh');
  });
})();
