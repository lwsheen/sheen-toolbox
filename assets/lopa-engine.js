/* ============================================================
 * lopa-engine.js — 保护层分析（LOPA）引擎（共享资源）
 *
 * 归属：PHA 过程危害分析工作台 → 模块三「风险量化 · 防线审查」内嵌工作区。
 * 原独立页 lopa-analysis/ 已转为 noindex stub 跳转 PHA，本文件为 LOPA 逻辑唯一来源。
 *
 * ⚠️ 关键约定（与 PHA 同页共存）：
 *   ① 全部 38 个顶层符号统一 lp* / LP_* 前缀，与 PHA 的 pha* 零冲突；
 *   ② **顶层必须是裸声明**（禁止 IIFE 包裹）—— inline onclick 依赖全局可见；
 *   ③ 本文件位于 assets/，build_minify.py 整体拷贝到 build/，**不经过 terser**
 *      （terser 的 mangle:true 会重命名顶层裸声明函数，破坏 inline onclick）；
 *   ④ 打印时间戳只写 `.pha-lopa-host .print-time`，不抢宿主页面的 #printTime；
 *   ⑤ 场景区实时重算绑定改为 DOM 就绪后执行 → 本脚本的 <script> 标签
 *      放在页面任何位置都不会抛 null 错误。
 * ============================================================ */

    // ⚠️ 业务函数必须裸声明（全局作用域），禁止 IIFE 包裹，否则 inline onclick 不可见

    /* ============================================================
       0. 北京时间 / 数值解析 / 格式化
       ============================================================ */
    function lpCnTime() {
        var d = new Date();
        var utc = d.getTime() + d.getTimezoneOffset() * 60000;
        var cn = new Date(utc + 8 * 3600000);
        var p = function (n) { return (n < 10 ? '0' : '') + n; };
        return {
            date: cn.getFullYear() + '-' + p(cn.getMonth() + 1) + '-' + p(cn.getDate()),
            str: cn.getFullYear() + '-' + p(cn.getMonth() + 1) + '-' + p(cn.getDate()) +
                 ' ' + p(cn.getHours()) + ':' + p(cn.getMinutes())
        };
    }

    /* 解析概率/频率输入，兼容 1e-3 / 1×10^-3 / 10^-3 / 0.001 */
    function lpParse(s) {
        if (s === null || s === undefined) return NaN;
        var t = String(s).trim();
        if (t === '') return NaN;
        t = t.replace(/\s+/g, '')
             .replace(/[×xXｘ*]/g, 'x')
             .replace(/[⁻ー−–—]/g, '-')
             .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, function (c) {
                 return String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c));
             });
        var m = t.match(/^(\d+(?:\.\d+)?)x10\^?\(?(-?\d+)\)?$/);
        if (m) return parseFloat(m[1]) * Math.pow(10, parseInt(m[2], 10));
        m = t.match(/^10\^?\(?(-?\d+)\)?$/);
        if (m) return Math.pow(10, parseInt(m[1], 10));
        m = t.match(/^(\d+(?:\.\d+)?)e(-?\d+)$/i);
        if (m) return parseFloat(m[1]) * Math.pow(10, parseInt(m[2], 10));
        var v = parseFloat(t);
        return isNaN(v) ? NaN : v;
    }

    /* 统一科学计数展示：1×10⁻⁵ */
    var LP_SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    function lpSup(n) {
        return String(n).split('').map(function (c) { return LP_SUP[c] || c; }).join('');
    }
    function lpSci(v) {
        if (!isFinite(v)) return '—';
        if (v === 0) return '0';
        var abs = Math.abs(v);
        if (abs >= 0.001 && abs < 100000) {
            var s = v.toPrecision(4);
            if (s.indexOf('.') !== -1) s = s.replace(/0+$/, '').replace(/\.$/, '');
            return s;
        }
        var e = Math.floor(Math.log10(abs));
        var mant = v / Math.pow(10, e);
        var ms = mant.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
        if (ms === '1') return '10' + lpSup(e);
        return ms + '×10' + lpSup(e);
    }
    function lpSciHtml(v) {
        if (!isFinite(v)) return '—';
        var abs = Math.abs(v);
        if (abs >= 0.001 && abs < 100000) {
            var s = v.toPrecision(4);
            if (s.indexOf('.') !== -1) s = s.replace(/0+$/, '').replace(/\.$/, '');
            return s;
        }
        var e = Math.floor(Math.log10(abs));
        var mant = v / Math.pow(10, e);
        var ms = mant.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
        return (ms === '1' ? '' : ms + '×') + '10<sup>' + e + '</sup>';
    }
    function lpEsc(s) {
        return String(s === null || s === undefined ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* ============================================================
       1. 标准数据（GB/T 32857-2025 附录 A）
       ============================================================ */

    /* 表 A.4 / A.5 / A.6 —— 后果分级（示例） */
    var LP_CONS = {
        safety: {
            name: '人员伤亡（表 A.4）',
            levels: {
                1: '造成 3 人以下轻伤',
                2: '造成 3 人（含）以下重伤，或者 3 人（含）以上 10 人以下轻伤',
                3: '造成 3 人以下死亡，或者 3 人（含）以上 10 人以下重伤，或者 10 人（含）以上轻伤',
                4: '造成 3 人（含）以上 10 人以下死亡，或者 10 人以上 50 人（含）以下重伤',
                5: '10 人（含）及以上死亡'
            }
        },
        env: {
            name: '环境影响（表 A.6）',
            levels: {
                1: 'a) 因环境污染疏散、转移人员 100 人以下的。\nb) 因环境污染造成直接经济损失 50 万元以下的',
                2: 'a) 因环境污染直接导致 3 人以下中毒或者重伤的。\nb) 因环境污染疏散、转移人员 100 人以上 1000 人以下的。\nc) 因环境污染造成直接经济损失 50 万元以上 200 万元以下的。\nd) 放射性同位素和射线装置失控导致人员受到超过年剂量限值的照射的',
                3: 'a) 因环境污染直接导致 3 人以下死亡，或者 3 人以上 10 人以下中毒或者重伤的。\nb) 因环境污染疏散、转移人员 1000 人以上 5000 人以下的。\nc) 因环境污染造成直接经济损失 200 万元以上 500 万元以下的。\nd) 因环境污染造成跨县级行政区域纠纷，引起一般性群体影响的。\ne) Ⅳ、Ⅴ类放射源丢失、被盗的；放射性物质泄漏，造成厂区内或者设施内局部辐射污染后果的',
                4: 'a) 因环境污染直接导致 3 人以上 10 人以下死亡或者 10 人以上 50 人以下中毒或者重伤的。\nb) 因环境污染疏散、转移人员 5000 人以上 1 万人以下的。\nc) 因环境污染造成直接经济损失 500 万元以上 2000 万元以下的。\nd) 因环境污染造成国家重点保护的动植物物种受到破坏的。\ne) 因环境污染造成乡镇集中式饮用水水源地取水中断的。\nf) Ⅲ类放射源丢失、被盗的；放射性同位素和射线装置失控导致 10 人以下急性重度放射病、局部器官残疾的；放射性物质泄漏，造成小范围辐射污染后果的。\ng) 造成跨设区的市级行政区域影响的突发环境事件',
                5: 'a) 因环境污染直接导致 10 人以上死亡或者 50 人以上中毒或者重伤的。\nb) 因环境污染疏散、转移人员 1 万人以上的。\nc) 因环境污染造成直接经济损失 2000 万元以上的。\nd) 因环境污染造成区域生态功能部分丧失或者该区域国家重点保护野生动植物种群大批死亡的。\ne) 因环境污染造成县级以上城市集中式饮用水水源地取水中断的。\nf) Ⅰ、Ⅱ类放射源丢失、被盗的、失控并造成大范围严重辐射污染后果的；放射性同位素和射线装置失控导致急性死亡或者 10 人以上急性重度放射病、局部器官残疾的；放射性物质泄漏，造成较大范围辐射污染后果的。\ng) 造成跨省级行政区域以上影响的突发环境事件'
            }
        },
        property: {
            name: '经济损失（表 A.5）',
            levels: {
                1: '造成 1000 元以上 10 万元（含）以下直接经济损失',
                2: '造成 10 万元以上 100 万元（含）以下直接经济损失',
                3: '造成 100 万元以上 1000 万元（含）以下直接经济损失',
                4: '造成 1000 万元以上 5000 万元（含）以下直接经济损失',
                5: '造成 5000 万元以上直接经济损失'
            }
        }
    };

    /* 表 A.10 / A.11 / A.12 —— 可容忍风险频率（次/年） */
    var LP_TOL = {
        safety:   { name: '安全与健康（表 A.10）', ft: { 1: 1e-1, 2: 1e-3, 3: 1e-5, 4: 1e-6, 5: 1e-7 } },
        env:      { name: '环境（表 A.11）',       ft: { 1: 1e-1, 2: 1e-2, 3: 1e-4, 4: 1e-5, 5: 1e-6 } },
        property: { name: '财产（表 A.12）',       ft: { 1: 1e-1, 2: 1e-2, 3: 1e-4, 4: 1e-5, 5: 1e-6 } }
    };

    /* 表 A.13 —— 常用初始事件频率（次/年） */
    var LP_IE = [
        { n: '压力容器疲劳失效', r: [1e-7, 1e-5] },
        { n: '管道疲劳失效-100m-全部断裂', r: [1e-6, 1e-5] },
        { n: '管线泄漏（10%截面积）-100m', r: [1e-4, 1e-3] },
        { n: '常压储罐失效', r: [1e-5, 1e-3] },
        { n: '垫片/填料爆裂', r: [1e-6, 1e-2] },
        { n: '涡轮/柴油发动机超速，外套破裂', r: [1e-4, 1e-3] },
        { n: '第三方破坏（挖掘机、车辆等外部影响）', r: [1e-4, 1e-2] },
        { n: '起重机载荷掉落', r: [1e-4, 1e-3] },
        { n: '雷击', r: [1e-4, 1e-3] },
        { n: '安全阀误开启', r: [1e-4, 1e-2] },
        { n: '冷却水失效', r: [1e-2, 1] },
        { n: '泵密封失效', r: [1e-2, 1e-1] },
        { n: '卸载/装载软管失效', r: [1e-2, 1] },
        { n: 'BPCS 仪表控制回路失效', r: [1e-2, 1] },
        { n: '调节器失效', r: [1e-1, 1] },
        { n: '小的外部火灾（多因素）', r: [1e-2, 1e-1] },
        { n: '大的外部火灾（多因素）', r: [1e-3, 1e-2] },
        { n: 'LOTO（锁定、标定）程序失效（多个元件的总失效）', r: [1e-4, 1e-3] },
        { n: '操作员失效（执行常规程序，假设得到较好的培训、不紧张、不疲劳）', r: [1e-3, 1e-1] }
    ];

    /* 表 A.8 —— 典型独立保护层 PFD 值 */
    var LP_IPL = [
        { n: '“本质安全”设计',             d: '如果正确地执行，将大大地降低相关场景后果的频率',                        pfd: 1e-2, lo: 1e-6, hi: 1e-1, open: true,  sil: '' },
        { n: 'BPCS 控制回路',               d: '如果与初始事件无关，BPCS 中的控制回路可确认为一种独立保护层',            pfd: 1e-1, lo: 1e-1, hi: 1e0,  open: true,  sil: '' },
        { n: '关键报警和人员响应（10min）', d: '人员行动，有 10 min 的响应时间；简单、记录良好的行动，指示清晰可靠',    pfd: 1e-1, lo: 1e-1, hi: 1e0,  open: true,  sil: '' },
        { n: '人员对 BPCS 报警的响应（40min）', d: '人员对 BPCS 指示或报警的响应，有 40 min 的响应时间',                 pfd: 1e-1, lo: 1e-1, hi: 1e-1, open: false, sil: '' },
        { n: '人员行动（40min）',           d: '人员行动，有 40 min 的响应时间；简单、记录良好的行动',                  pfd: 1e-2, lo: 1e-2, hi: 1e-1, open: true,  sil: '' },
        { n: 'SIS / SIF（SIL1）',           d: '典型组成：单个传感器 + 单个逻辑解算器 + 单个最终元件',                  pfd: 1e-2, lo: 1e-2, hi: 1e-1, open: false, sil: 'SIL1' },
        { n: 'SIS / SIF（SIL2）',           d: '典型组成：多个传感器 + 多个通道逻辑解算器 + 多个最终元件',              pfd: 1e-3, lo: 1e-3, hi: 1e-2, open: false, sil: 'SIL2' },
        { n: 'SIS / SIF（SIL3）',           d: '典型组成：多个传感器 + 多通道逻辑解算器 + 多个最终元件',                pfd: 1e-4, lo: 1e-4, hi: 1e-3, open: false, sil: 'SIL3' },
        { n: '安全阀（PSV）',               d: '防止系统超压。其有效性对服役条件比较敏感',                              pfd: 1e-2, lo: 1e-3, hi: 1e-1, open: true,  sil: '' },
        { n: '爆破片',                      d: '防止系统超压。其有效性对服役条件比较敏感',                              pfd: 1e-2, lo: 1e-3, hi: 1e-1, open: true,  sil: '' },
        { n: '防火堤',                      d: '降低储罐溢流、破裂、泄漏等严重后果（大面积扩散）的频率',                  pfd: 1e-3, lo: 1e-3, hi: 1e-2, open: true,  sil: '' },
        { n: '地下排污系统',                d: '降低储罐溢流、破裂、泄漏等严重后果（大面积扩散）的频率',                  pfd: 1e-3, lo: 1e-3, hi: 1e-2, open: true,  sil: '' },
        { n: '开式通风口',                  d: '防止超压',                                                              pfd: 1e-3, lo: 1e-3, hi: 1e-2, open: true,  sil: '' },
        { n: '耐火材料',                    d: '减少热输入率，为降压/消防等提供额外的响应时间',                          pfd: 1e-3, lo: 1e-3, hi: 1e-2, open: true,  sil: '' },
        { n: '防爆墙 / 舱',                 d: '通过限制冲击波，保护设备/建筑物等，降低爆炸重大后果的频率',              pfd: 1e-3, lo: 1e-3, hi: 1e-2, open: true,  sil: '' }
    ];

    /* 表 A.9 —— 风险矩阵（示例）；行 = 后果频率区间，列 = 后果等级 1..5 */
    var LP_MX_BANDS = [
        { label: '10⁻¹~10⁰',  lo: 1e-1, hi: 1e0 },
        { label: '10⁻²~10⁻¹', lo: 1e-2, hi: 1e-1 },
        { label: '10⁻³~10⁻²', lo: 1e-3, hi: 1e-2 },
        { label: '10⁻⁴~10⁻³', lo: 1e-4, hi: 1e-3 },
        { label: '10⁻⁵~10⁻⁴', lo: 1e-5, hi: 1e-4 },
        { label: '10⁻⁶~10⁻⁵', lo: 1e-6, hi: 1e-5 },
        { label: '10⁻⁷~10⁻⁶', lo: 1e-7, hi: 1e-6 }
    ];
    /* none=不需要采取行动 opt=可选择(评估方案) act=采取行动(通知公司) now=立即采取行动(通知公司) */
    var LP_MX_ROWS = [
        ['opt', 'opt', 'act', 'now', 'now'],
        ['opt', 'opt', 'opt', 'act', 'now'],
        ['none', 'opt', 'opt', 'act', 'act'],
        ['none', 'none', 'opt', 'opt', 'act'],
        ['none', 'none', 'none', 'opt', 'opt'],
        ['none', 'none', 'none', 'none', 'opt'],
        ['none', 'none', 'none', 'none', 'none']
    ];
    var LP_MX_TEXT = {
        none: '不需要采取行动',
        opt: '可选择（评估方案）',
        act: '采取行动（通知公司）',
        now: '立即采取行动（通知公司）'
    };

    /* 不宜作为独立保护层的措施（7.7.1） */
    var LP_BAD_IPL_KW = ['培训', '取证', '规程', '定期测试', '测试和检测', '检测', '维护', '维修', '警示标识', '标识'];
    /* 不宜作为初始事件的描述（7.4.2 f） */
    var LP_BAD_IE_KW = ['培训不充分', '测试不完善', '检查不完善', '安全阀失效', '物理保护功能失效'];

    /* ============================================================
       2. 页面初始化
       ============================================================ */
    var lpScenSeq = 0;
    var lpFtManual = false;
    /* 本地持久化：与 PHA 主机页共用 localStorage 但使用独立键，互不覆盖 */
    var LP_STORE_KEY = 'sheen_lopa_v1';
    var lpSaveTimer = null;
    var lpSuppressSave = false;

    function lpInit() {
        document.getElementById('lpDate').value = lpCnTime().date;

        /* 单选行高亮 */
        ['lpCtgRow', 'lpMethodRow'].forEach(function (id) {
            var box = document.getElementById(id);
            box.addEventListener('change', function () {
                var ls = box.querySelectorAll('label');
                for (var i = 0; i < ls.length; i++) {
                    var inp = ls[i].querySelector('input');
                    ls[i].classList.toggle('on', !!(inp && inp.checked));
                }
                if (id === 'lpCtgRow') lpOnLevelChange();
            });
        });

        /* 附录 Tab */
        document.getElementById('lpTabs').addEventListener('click', function (e) {
            var b = e.target.closest ? e.target.closest('.lp-tab') : null;
            if (!b) return;
            var tabs = this.querySelectorAll('.lp-tab');
            for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('on');
            b.classList.add('on');
            var panels = document.querySelectorAll('.lp-panel');
            for (var j = 0; j < panels.length; j++) panels[j].classList.remove('on');
            var t = document.getElementById(b.getAttribute('data-panel'));
            if (t) t.classList.add('on');
        });

        lpRenderRefTables();
        lpAddScenario();
        lpRenderMatrix(document.getElementById('lpMatrixRef'), null, null);
        lpOnLevelChange();

        /* 打印时间戳：仅在 LOPA 容器内查找 .print-time，避免与宿主页面
           PHA 的 #printTime 抢写（两页各有同 id 元素）。宿主无该元素时静默跳过。 */
        var lpPt = document.querySelector('.pha-lopa-host .print-time');
        if (lpPt) lpPt.textContent = '打印时间：' + lpCnTime().str + '（北京时间）';
    }

    /* ---------- 附录速查表渲染 ---------- */
    function lpRenderRefTables() {
        /* A.4/A.5/A.6 */
        var h = '<thead><tr><th style="width:110px;">后果类别</th><th style="width:60px;">等级</th><th>后果描述</th></tr></thead><tbody>';
        ['safety', 'property', 'env'].forEach(function (k) {
            var c = LP_CONS[k];
            for (var lv = 1; lv <= 5; lv++) {
                h += '<tr>';
                if (lv === 1) h += '<td rowspan="5" class="mono">' + lpEsc(c.name) + '</td>';
                h += '<td class="mono">' + lv + ' 级</td>';
                h += '<td>' + lpEsc(c.levels[lv]).replace(/\n/g, '<br>') + '</td>';
                h += '</tr>';
            }
        });
        h += '</tbody>';
        document.getElementById('lpRefCons').innerHTML = h;

        /* A.10/A.11/A.12 */
        var t = '<thead><tr><th style="width:130px;">后果类别</th><th style="width:70px;">严重程度</th><th style="width:130px;">可容忍风险频率（次/年）</th></tr></thead><tbody>';
        [['safety', ['5 级，灾难性的', '4 级，严重的', '3 级，较大的', '2 级，较小的', '1 级，微小的']],
         ['env', ['5 级，灾难性的', '4 级，重大的', '3 级，较大的', '2 级，较小的', '1 级，微小的']],
         ['property', ['5 级，灾难性的', '4 级，重大的', '3 级，较大的', '2 级，较小的', '1 级，微小的']]
        ].forEach(function (pair) {
            var k = pair[0], names = pair[1];
            for (var lv = 5; lv >= 1; lv--) {
                t += '<tr>';
                if (lv === 5) t += '<td rowspan="5" class="mono">' + lpEsc(LP_TOL[k].name) + '</td>';
                t += '<td>' + lpEsc(names[5 - lv]) + '</td>';
                t += '<td class="mono">' + lpSciHtml(LP_TOL[k].ft[lv]) + '</td>';
                t += '</tr>';
            }
        });
        t += '</tbody>';
        document.getElementById('lpRefTol').innerHTML = t;

        /* A.13 */
        var i = '<thead><tr><th>初始事件</th><th style="width:170px;">频率范围（次/年）</th></tr></thead><tbody>';
        LP_IE.forEach(function (e) {
            i += '<tr><td>' + lpEsc(e.n) + '</td><td class="mono">' + lpSciHtml(e.r[0]) + ' ~ ' + lpSciHtml(e.r[1]) + '</td></tr>';
        });
        i += '</tbody>';
        document.getElementById('lpRefIe').innerHTML = i;

        /* A.8 */
        var p = '<thead><tr><th style="width:210px;">独立保护层</th><th>说明</th><th style="width:170px;">PFD</th></tr></thead><tbody>';
        LP_IPL.forEach(function (x) {
            var range = (x.lo === x.hi)
                ? lpSciHtml(x.lo)
                : '[' + lpSciHtml(x.lo) + ', ' + lpSciHtml(x.hi) + (x.open ? ')' : ']');
            p += '<tr><td>' + lpEsc(x.n) + '</td><td>' + lpEsc(x.d) + '</td><td class="mono">' + range + '</td></tr>';
        });
        p += '</tbody>';
        document.getElementById('lpRefIpl').innerHTML = p;
    }

    /* ============================================================
       3. 场景卡片
       ============================================================ */
    function lpIeOptions(selected) {
        var h = '<option value="">— 自定义 / 请选择 —</option>';
        LP_IE.forEach(function (e, idx) {
            h += '<option value="' + idx + '"' + (String(selected) === String(idx) ? ' selected' : '') + '>' +
                 lpEsc(e.n + '（' + lpSci(e.r[0]) + '~' + lpSci(e.r[1]) + '）') + '</option>';
        });
        return h;
    }

    function lpIplTypeOptions(selected) {
        var h = '<option value="">— 选择类型（表 A.8）—</option>';
        LP_IPL.forEach(function (x, idx) {
            h += '<option value="' + idx + '"' + (String(selected) === String(idx) ? ' selected' : '') + '>' + lpEsc(x.n) + '</option>';
        });
        return h;
    }

    function lpAddScenario() {
        lpScenSeq++;
        var id = lpScenSeq;
        var wrap = document.createElement('div');
        wrap.className = 'lp-sc';
        wrap.setAttribute('data-scen', id);
        wrap.innerHTML =
            '<div class="lp-sc-head">' +
              '<span class="lp-sc-no">场景 ' + id + '</span>' +
              '<input type="text" class="form-control lp-sc-name" placeholder="场景描述，如：冷却水故障引起反应失控">' +
              '<button type="button" class="lp-del-btn" title="删除场景" onclick="lpDelScenario(this)"><i class="fa-solid fa-trash-can"></i></button>' +
            '</div>' +
            '<div class="lp-sc-body">' +
              '<div class="lp-grid">' +
                '<div class="lp-field"><label>初始事件</label>' +
                  '<select class="form-control lp-ie-sel" onchange="lpOnIePick(this)">' + lpIeOptions('') + '</select>' +
                  '<span class="lp-tip">取自表 A.13；选定后自动填入名称与频率下限，可再手动调整。</span></div>' +
                '<div class="lp-field"><label>初始事件名称（自定义/最终采用）</label>' +
                  '<input type="text" class="form-control lp-ie-name" placeholder="如 冷却水失效"></div>' +
                '<div class="lp-field"><label>初始事件频率 f<sub>I</sub>（次/年）</label>' +
                  '<input type="text" class="form-control lp-ie-freq" placeholder="如 1e-1" oninput="lpLiveRecalc()">' +
                  '<span class="lp-tip lp-ie-hint"></span></div>' +
                '<div class="lp-field"><label>使能条件 P<sub>E</sub></label>' +
                  '<input type="text" class="form-control lp-pe" placeholder="无使能条件时填 1" value="1" oninput="lpLiveRecalc()">' +
                  '<span class="lp-tip">7.5.2.1：单项不宜低于 0.1，乘积不宜小于 0.01</span></div>' +
                '<div class="lp-field"><label>条件修正因子 P<sub>C</sub></label>' +
                  '<input type="text" class="form-control lp-pc" placeholder="无修正时填 1" value="1" oninput="lpLiveRecalc()">' +
                  '<span class="lp-tip">7.6.2：乘积不宜小于 0.01；暴露致死率不宜小于 0.1</span></div>' +
                '<div class="lp-field"><label>要求模式</label>' +
                  '<select class="form-control lp-mode" onchange="lpOnModeChange(this)">' +
                    '<option value="low">低要求模式（公式 2 / 3）</option>' +
                    '<option value="high">高要求模式（附录 E）</option>' +
                  '</select>' +
                  '<span class="lp-tip">初始事件频率持续 &gt; 1 次/年 时为高要求模式。</span></div>' +
              '</div>' +

              '<div class="lp-hd-fields" style="display:none;margin-top:12px;">' +
                '<div class="lp-grid">' +
                  '<div class="lp-field"><label>第 1 个 IPL 失效频率 f<sub>IPL1</sub>（次/年，可留空）</label>' +
                    '<input type="text" class="form-control lp-ipl1f" placeholder="已知时填写，如 0.1">' +
                    '<span class="lp-tip">公式 E.1 / E.3：以该失效频率替代初始事件频率</span></div>' +
                  '<div class="lp-field"><label>检验测试间隔 TI（年）</label>' +
                    '<input type="text" class="form-control lp-ti" placeholder="如 1">' +
                    '<span class="lp-tip">公式 E.2 / E.4：f<sub>C</sub> = 2 × (1/TI) × PFD<sub>IPL</sub></span></div>' +
                '</div>' +
              '</div>' +

              '<div class="lp-sub-title">独立保护层（IPL）— 按表 A.8 取值</div>' +
              '<div class="lp-ipl-scroll"><table class="lp-ipl-table">' +
                '<thead><tr><th style="width:34px;">#</th><th>独立保护层名称</th><th>类型（表 A.8）</th>' +
                '<th style="width:110px;">PFD</th><th class="lp-c-op"></th></tr></thead>' +
                '<tbody class="lp-ipl-body"></tbody>' +
              '</table></div>' +
              '<button type="button" class="lp-add-btn" onclick="lpAddIpl(this)"><i class="fa-solid fa-plus"></i> 添加独立保护层</button>' +

              '<div class="lp-sub-title">保护措施（非独立保护层）— 第 8 章 g) 项</div>' +
              '<div class="lp-field"><textarea class="form-control lp-nonipl" rows="2" placeholder="如：操作员行动（同一操作员的其他操作步骤不独立于报警和人为动作）；紧急冷却水系统（存在共同失效因素）"></textarea></div>' +

              '<div class="lp-subtotal lp-sub-out">' +
                '<span>本场景后果频率 f<sub>Cn</sub> =</span><b>—</b>' +
                '<span class="lp-formula"></span>' +
              '</div>' +
            '</div>';
        document.getElementById('lpScenarios').appendChild(wrap);
        lpAddIpl(wrap.querySelector('.lp-add-btn'));
        lpRenumber();
    }

    function lpDelScenario(btn) {
        var card = btn.closest('.lp-sc');
        if (!card) return;
        var all = document.querySelectorAll('#lpScenarios .lp-sc');
        if (all.length <= 1) { alert('至少保留一个场景。'); return; }
        card.parentNode.removeChild(card);
        lpRenumber();
        lpLiveRecalc();
    }

    function lpRenumber() {
        var all = document.querySelectorAll('#lpScenarios .lp-sc');
        for (var i = 0; i < all.length; i++) {
            var no = all[i].querySelector('.lp-sc-no');
            if (no) no.textContent = '场景 ' + (i + 1);
        }
    }

    function lpOnIePick(sel) {
        var card = sel.closest('.lp-sc');
        if (!card) return;
        var v = sel.value;
        var nameEl = card.querySelector('.lp-ie-name');
        var fEl = card.querySelector('.lp-ie-freq');
        var hintEl = card.querySelector('.lp-ie-hint');
        if (v === '') return;
        var e = LP_IE[parseInt(v, 10)];
        if (!e) return;
        /* 用户显式从表 A.13 中选择 → 名称与频率下限一并填入（可直接再手改） */
        if (nameEl) nameEl.value = e.n;
        if (fEl) fEl.value = lpSci(e.r[0]);
        /* 不自动切换要求模式（表 A.13 上限普遍 ≤ 1 次/年，自动判断易误伤）；
           仅给出提示，由合规自检在 f_I > 1 且为低要求模式时强制报警。 */
        if (hintEl) {
            if (e.r[1] >= 1) {
                hintEl.textContent = '表 A.13 该事件频率上限达 1 次/年，若实际取值大于 1 次/年则为高要求模式（附录 E），请在右侧确认「要求模式」。';
                hintEl.style.color = 'var(--warn-700)';
            } else {
                hintEl.textContent = '参考范围 ' + lpSci(e.r[0]) + ' ~ ' + lpSci(e.r[1]) + ' 次/年，请按行业经验与现场实际取值。';
                hintEl.style.color = '';
            }
        }
        lpLiveRecalc();
    }

    function lpOnModeChange(sel) {
        if (!sel) return;
        var card = sel.closest('.lp-sc');
        if (!card) return;
        var hd = card.querySelector('.lp-hd-fields');
        if (hd) hd.style.display = (sel.value === 'high') ? 'block' : 'none';
        lpLiveRecalc();
    }

    function lpAddIpl(btn) {
        var card = btn.closest('.lp-sc');
        if (!card) return;
        var body = card.querySelector('.lp-ipl-body');
        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td class="lp-c-op lp-ipl-idx" style="font-family:var(--font-mono);color:var(--text-secondary);"></td>' +
            '<td><input type="text" class="form-control lp-ipl-name" placeholder="如 安全仪表功能 SIF-01 打开放空阀"></td>' +
            '<td class="lp-c-type"><select class="form-control lp-ipl-type" onchange="lpOnIplType(this)">' + lpIplTypeOptions('') + '</select></td>' +
            '<td class="lp-c-pfd"><input type="text" class="form-control lp-ipl-pfd" placeholder="如 1e-2"></td>' +
            '<td class="lp-c-op"><button type="button" class="lp-del-btn" title="删除" onclick="lpDelIpl(this)"><i class="fa-solid fa-xmark"></i></button></td>';
        body.appendChild(tr);
        lpRenumberIpl(card);
    }

    function lpDelIpl(btn) {
        var tr = btn.closest('tr');
        if (!tr) return;
        var card = btn.closest('.lp-sc');
        tr.parentNode.removeChild(tr);
        if (card) lpRenumberIpl(card);
        lpLiveRecalc();
    }

    function lpRenumberIpl(card) {
        if (!card) return;
        var trs = card.querySelectorAll('.lp-ipl-body tr');
        for (var i = 0; i < trs.length; i++) {
            var c = trs[i].querySelector('.lp-ipl-idx');
            if (c) c.textContent = (i + 1);
        }
    }

    function lpOnIplType(sel) {
        var tr = sel.closest('tr');
        var v = sel.value;
        if (!tr || v === '') return;
        var x = LP_IPL[parseInt(v, 10)];
        if (!x) return;
        var pfdEl = tr.querySelector('.lp-ipl-pfd');
        if (pfdEl && !pfdEl.value.trim()) pfdEl.value = lpSci(x.pfd);
        var nameEl = tr.querySelector('.lp-ipl-name');
        if (nameEl && !nameEl.value.trim()) nameEl.value = x.n;
    }

    /* ============================================================
       4. 可容忍风险联动
       ============================================================ */
    function lpGetCtg() {
        var r = document.querySelector('input[name="lpCtg"]:checked');
        return r ? r.value : 'safety';
    }
    function lpGetMethod() {
        var r = document.querySelector('input[name="lpMethod"]:checked');
        return r ? r.value : 'single';
    }
    function lpOnLevelChange() {
        var ctg = lpGetCtg();
        var lv = document.getElementById('lpConsLevel').value;
        var desc = LP_CONS[ctg].levels[lv] || '';
        document.getElementById('lpConsLevelDesc').value = desc.replace(/\n/g, ' / ');
        document.getElementById('lpLevelStd').innerHTML =
            '<b>' + lpEsc(LP_CONS[ctg].name) + ' · ' + lv + ' 级</b>：' + lpEsc(desc).replace(/\n/g, '<br>');

        var ftEl = document.getElementById('lpFt');
        if (!lpFtManual || !ftEl.value.trim()) {
            ftEl.value = lpSci(LP_TOL[ctg].ft[lv]);
            lpFtManual = false;
        }
        document.getElementById('lpFtTip').textContent =
            '自动取自' + LP_TOL[ctg].name + '（' + lv + ' 级 = ' + lpSci(LP_TOL[ctg].ft[lv]) + ' 次/年）；可手动覆盖（须注明依据）。';
        lpLiveRecalc();
    }
    function lpOnFtManual() {
        lpFtManual = true;
        lpLiveRecalc();
    }

    /* ============================================================
       5. 读取 DOM → 场景数据
       ============================================================ */
    function lpReadScenarios() {
        var out = [];
        var cards = document.querySelectorAll('#lpScenarios .lp-sc');
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            var ipls = [];
            var trs = c.querySelectorAll('.lp-ipl-body tr');
            for (var j = 0; j < trs.length; j++) {
                var tr = trs[j];
                var nm = (tr.querySelector('.lp-ipl-name') || {}).value || '';
                var pfdRaw = (tr.querySelector('.lp-ipl-pfd') || {}).value || '';
                var tyRaw = (tr.querySelector('.lp-ipl-type') || {}).value || '';
                if (!nm.trim() && !pfdRaw.trim()) continue;
                ipls.push({
                    name: nm.trim(),
                    typeIdx: tyRaw === '' ? -1 : parseInt(tyRaw, 10),
                    pfd: lpParse(pfdRaw)
                });
            }
            out.push({
                el: c,
                no: i + 1,
                name: ((c.querySelector('.lp-sc-name') || {}).value || '').trim(),
                ieIdx: ((c.querySelector('.lp-ie-sel') || {}).value || ''),
                ieName: ((c.querySelector('.lp-ie-name') || {}).value || '').trim(),
                fi: lpParse((c.querySelector('.lp-ie-freq') || {}).value),
                pe: lpParse((c.querySelector('.lp-pe') || {}).value),
                pc: lpParse((c.querySelector('.lp-pc') || {}).value),
                mode: ((c.querySelector('.lp-mode') || {}).value || 'low'),
                ipl1f: lpParse((c.querySelector('.lp-ipl1f') || {}).value),
                ti: lpParse((c.querySelector('.lp-ti') || {}).value),
                nonIpl: ((c.querySelector('.lp-nonipl') || {}).value || '').trim(),
                ipls: ipls
            });
        }
        return out;
    }

    /* ============================================================
       6. 核心计算
       ============================================================ */
    function lpCompute(scen, ft) {
        var r = { err: [], warns: [] };
        var pe = isNaN(scen.pe) ? 1 : scen.pe;
        var pc = isNaN(scen.pc) ? 1 : scen.pc;
        r.pe = pe; r.pc = pc;

        if (isNaN(scen.fi)) { r.err.push('初始事件频率未填写或无法识别'); }
        if (!scen.name) r.warns.push('场景描述为空');
        if (r.err.length) { r.fc = NaN; r.pfds = []; return r; }

        /* 校验 PFD 取值 */
        var iplsOk = [];
        for (var i = 0; i < scen.ipls.length; i++) {
            var x = scen.ipls[i];
            if (isNaN(x.pfd)) { r.err.push('独立保护层「' + (x.name || ('#' + (i + 1))) + '」的 PFD 无法识别'); continue; }
            if (x.pfd <= 0 || x.pfd > 1) { r.err.push('独立保护层「' + (x.name || ('#' + (i + 1))) + '」的 PFD 应在 (0, 1] 区间'); continue; }
            iplsOk.push(x);
        }
        if (r.err.length) { r.fc = NaN; r.pfds = []; return r; }

        if (scen.mode === 'high') {
            /* 附录 E 高要求模式 */
            if (iplsOk.length === 0) {
                r.err.push('高要求模式下至少需要 1 个独立保护层才能按附录 E 计算');
                r.fc = NaN; r.pfds = []; return r;
            }
            var first = iplsOk[0];
            var rest = iplsOk.slice(1);
            var base, baseHow;
            if (!isNaN(scen.ipl1f)) {
                base = scen.ipl1f;
                baseHow = 'E.1/E.3';
                r.baseLabel = '第 1 个 IPL 失效频率 f_IPL1 = ' + lpSci(base) + ' 次/年';
            } else {
                if (isNaN(scen.ti) || scen.ti <= 0) {
                    r.err.push('未提供第 1 个 IPL 失效频率时，须填写检验测试间隔 TI（> 0）');
                    r.fc = NaN; r.pfds = []; return r;
                }
                base = 2 * (1 / scen.ti) * first.pfd;
                baseHow = 'E.2/E.4';
                r.baseLabel = '2 × (1/TI) × PFD_IPL1 = 2 × (1/' + lpSci(scen.ti) + ') × ' + lpSci(first.pfd) + ' = ' + lpSci(base) + ' 次/年';
            }
            var prod = 1;
            for (var k = 0; k < rest.length; k++) prod *= rest[k].pfd;
            r.fc = base * pc * prod;
            r.base = base; r.baseHow = baseHow;
            r.pfds = iplsOk.map(function (x) { return x.pfd; });
            r.formula = '附录 E（' + baseHow + '）：f_C = ' + lpSci(base) + ' × P_C(' + lpSci(pc) + ')' +
                         (rest.length ? ' × ∏PFD(' + lpSci(prod) + ')' : '') + ' = ' + lpSci(r.fc) + ' 次/年';
            r.note = '高要求模式：按 E.3，以第 1 个 IPL 的失效频率替代经修正的初始事件频率，故不再单独乘 P_E（本场景 P_E = ' + lpSci(pe) + '）。';
            return r;
        }

        /* 低要求模式：公式（2） */
        var prodAll = 1;
        for (var m = 0; m < iplsOk.length; m++) prodAll *= iplsOk[m].pfd;
        r.fc = scen.fi * pe * pc * prodAll;
        r.prod = prodAll;
        r.pfds = iplsOk.map(function (x) { return x.pfd; });
        r.formula = '公式(2)：f_Cn = f_I(' + lpSci(scen.fi) + ') × P_E(' + lpSci(pe) + ') × P_C(' + lpSci(pc) + ')' +
                     (iplsOk.length ? ' × ∏PFD(' + lpSci(prodAll) + ')' : '') + ' = ' + lpSci(r.fc) + ' 次/年';
        return r;
    }

    /* 按后果频率查风险矩阵 */
    function lpMatrixHit(freq) {
        if (!isFinite(freq) || freq <= 0) return null;
        for (var i = 0; i < LP_MX_BANDS.length; i++) {
            var b = LP_MX_BANDS[i];
            if (freq >= b.lo && freq <= b.hi) return i;
        }
        if (freq > LP_MX_BANDS[0].hi) return -2;  /* 超出矩阵上限 */
        return -3;                                /* 低于矩阵下限 */
    }

    /* 由所需 PFD 推 SIL 建议 */
    function lpSilAdvice(pfd) {
        if (!isFinite(pfd)) return { sil: '—', text: '—' };
        if (pfd < 1e-4) return { sil: '超出 SIL3', text: '所需削减倍数超出单个 SIF 的 SIL3 能力，建议采用多重独立保护层、冗余设计或重新进行工艺本质安全化设计。' };
        if (pfd < 1e-3) return { sil: 'SIL3', text: '建议新增安全仪表功能达到 SIL3（PFD ∈ [10⁻⁴, 10⁻³)）。' };
        if (pfd < 1e-2) return { sil: 'SIL2', text: '建议新增安全仪表功能达到 SIL2（PFD ∈ [10⁻³, 10⁻²)）。' };
        if (pfd < 1e-1) return { sil: 'SIL1', text: '建议新增安全仪表功能达到 SIL1（PFD ∈ [10⁻², 10⁻¹)）。' };
        return { sil: '低于 SIL1', text: '所需削减倍数较小，可优先考虑 BPCS 控制回路、关键报警+人员响应、安全阀/爆破片等非 SIS 保护层（表 A.8）。' };
    }

    /* ============================================================
       7. 主计算入口
       ============================================================ */
    var LP_LAST = null;

    function lpCalculate() {
        var ctg = lpGetCtg();
        var method = lpGetMethod();
        var level = parseInt(document.getElementById('lpConsLevel').value, 10);
        var ft = lpParse(document.getElementById('lpFt').value);
        var ftStd = LP_TOL[ctg].ft[level];

        if (isNaN(ft) || ft <= 0) {
            alert('请填写有效的可容忍风险频率 ft（次/年），例如 1e-5。');
            return;
        }
        var scen = lpReadScenarios();
        if (!scen.length) { alert('请至少添加一个场景。'); return; }

        var results = [];
        var allErr = [];
        for (var i = 0; i < scen.length; i++) {
            var r = lpCompute(scen[i], ft);
            if (r.err.length) allErr = allErr.concat(r.err.map(function (e) { return '场景 ' + (i + 1) + '：' + e; }));
            results.push(r);
        }
        if (allErr.length) {
            alert('请先修正以下问题：\n\n· ' + allErr.join('\n· '));
            return;
        }

        /* 找最大频率场景（单一场景分析法的控制场景） */
        var maxIdx = 0, maxFc = -1, sumFc = 0;
        for (var j = 0; j < results.length; j++) {
            var f = results[j].fc;
            sumFc += f;
            if (f > maxFc) { maxFc = f; maxIdx = j; }
        }
        var govFc = (method === 'multi') ? sumFc : maxFc;
        var pass = govFc <= ft;
        var rrf = govFc / ft;
        var needPfd = pass ? NaN : (ft / govFc);

        LP_LAST = {
            ctg: ctg, method: method, level: level, ft: ft, ftStd: ftStd,
            scen: scen, results: results, maxIdx: maxIdx, maxFc: maxFc,
            sumFc: sumFc, govFc: govFc, pass: pass, rrf: rrf, needPfd: needPfd,
            meta: {
                nodeNo: document.getElementById('lpNodeNo').value.trim(),
                nodeName: document.getElementById('lpNodeName').value.trim(),
                analyst: document.getElementById('lpAnalyst').value.trim(),
                date: document.getElementById('lpDate').value.trim(),
                consDesc: document.getElementById('lpConsDesc').value.trim(),
                initRisk: document.getElementById('lpInitRisk').value.trim()
            }
        };

        lpRenderResult();
        lpBuildRecord();
        lpLiveRecalc();          /* 让各场景小计与本次计算所用取值保持同步 */
        document.getElementById('lpResultWrap').style.display = 'block';
        document.getElementById('lpResultWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* 输入变化时的轻量联动（仅更新小计，不触发完整计算） */
    function lpLiveRecalc() {
        var scen = lpReadScenarios();
        var ctg = lpGetCtg();
        var level = document.getElementById('lpConsLevel').value;
        var ft = lpParse(document.getElementById('lpFt').value);
        if (isNaN(ft)) ft = LP_TOL[ctg].ft[level];
        for (var i = 0; i < scen.length; i++) {
            var card = scen[i].el;
            var r = lpCompute(scen[i], ft);
            var out = card.querySelector('.lp-sub-out');
            if (!out) continue;
            var b = out.querySelector('b');
            var fm = out.querySelector('.lp-formula');
            if (isNaN(r.fc)) { b.textContent = '—'; fm.textContent = r.err.join('；'); }
            else { b.textContent = lpSci(r.fc) + ' 次/年'; fm.textContent = r.formula; }
        }
    }

    /* ============================================================
       8. 结果渲染
       ============================================================ */
    function lpRenderResult() {
        var D = LP_LAST;
        if (!D) return;
        var sil = lpSilAdvice(D.needPfd);

        /* --- 结论 --- */
        var v = '<div class="lp-verdict ' + (D.pass ? 'pass' : 'fail') + '">';
        v += '<div class="lp-verdict-top"><i class="fa-solid ' + (D.pass ? 'fa-circle-check' : 'fa-triangle-exclamation') + '"></i>' +
             (D.pass ? '当前保护层满足可容忍风险要求' : '当前保护层不满足可容忍风险要求，需补充保护措施') + '</div>';
        v += '<div class="lp-kv">';
        v += '<div class="lp-kv-item"><span class="lp-kv-k">' + (D.method === 'multi' ? '复合场景后果频率 f_C' : '控制场景后果频率 f_Cn') + '</span>' +
             '<span class="lp-kv-v">' + lpSci(D.govFc) + '</span></div>';
        v += '<div class="lp-kv-item"><span class="lp-kv-k">可容忍风险频率 f_t</span>' +
             '<span class="lp-kv-v">' + lpSci(D.ft) + '</span></div>';
        v += '<div class="lp-kv-item"><span class="lp-kv-k">风险削减因子 RRF = f/f_t（公式' + (D.method === 'multi' ? ' 6' : ' 5') + '）</span>' +
             '<span class="lp-kv-v">' + (isFinite(D.rrf) ? D.rrf.toPrecision(4).replace(/0+$/, '').replace(/\.$/, '') : '—') + '</span></div>';
        if (!D.pass) {
            v += '<div class="lp-kv-item"><span class="lp-kv-k">需新增保护层 PFD ≤ f_t / f</span>' +
                 '<span class="lp-kv-v">' + lpSci(D.needPfd) + '</span></div>';
            v += '<div class="lp-kv-item"><span class="lp-kv-k">建议 SIL 等级（参考）</span>' +
                 '<span class="lp-kv-v sm">' + lpEsc(sil.sil) + '</span></div>';
        } else {
            v += '<div class="lp-kv-item"><span class="lp-kv-k">安全裕度 f_t / f</span>' +
                 '<span class="lp-kv-v">' + (isFinite(D.govFc) && D.govFc > 0 ? (D.ft / D.govFc).toPrecision(4).replace(/0+$/, '').replace(/\.$/, '') : '—') + '</span></div>';
        }
        v += '</div>';
        v += '<div class="lp-verdict-note">';
        if (D.pass) {
            v += '按 7.10 b)，计算得出的后果频率不大于可容忍风险频率，当前设置已满足风险降低要求，无需补充独立保护层。' +
                 '建议持续保持现有 IPL 的功能测试、维护与变更管理，并定期复核初始事件频率与 PFD 取值的适用性。';
        } else {
            v += '按 7.10 c)，计算得出的后果频率大于可容忍风险频率，LOPA 小组应提出满足可容忍风险标准所需采取的措施及其负责人和预计行动完成日期，' +
                 '并确定拟采取保护措施的 PFD 或 RRF 值。' + lpEsc(sil.text);
        }
        v += '</div></div>';
        document.getElementById('lpVerdict').innerHTML = v;

        /* --- 各场景汇总表 --- */
        var h = '<thead><tr><th style="width:52px;">场景</th><th>描述</th><th>初始事件</th>' +
                '<th class="num">f_I</th><th class="num">P_E</th><th class="num">P_C</th>' +
                '<th class="num">∏PFD</th><th class="num">f_Cn（次/年）</th><th>是否满足</th></tr></thead><tbody>';
        for (var i = 0; i < D.results.length; i++) {
            var s = D.scen[i], r = D.results[i];
            var isGov = (D.method === 'single') && (i === D.maxIdx);
            var ok = r.fc <= D.ft;
            h += '<tr class="' + (isGov ? 'row-governing' : '') + (ok ? '' : ' row-fail') + '">';
            h += '<td class="num">' + (i + 1) + '</td>';
            h += '<td>' + (lpEsc(s.name) || '<span class="lp-placeholder">—</span>') +
                 (isGov ? ' <span class="badge badge-red" style="margin-left:4px;">控制场景</span>' : '') + '</td>';
            h += '<td>' + (lpEsc(s.ieName) || '<span class="lp-placeholder">—</span>') + '</td>';
            h += '<td class="num">' + lpSci(s.fi) + '</td>';
            h += '<td class="num">' + lpSci(r.pe) + '</td>';
            h += '<td class="num">' + lpSci(r.pc) + '</td>';
            h += '<td class="num">' + (s.mode === 'high' ? '附录E' : (r.prod === undefined ? '1' : lpSci(r.prod))) + '</td>';
            h += '<td class="num"><b>' + lpSci(r.fc) + '</b></td>';
            h += '<td>' + (ok ? '<span class="badge badge-green">满足</span>' : '<span class="badge badge-red">不满足</span>') + '</td>';
            h += '</tr>';
        }
        if (D.method === 'multi') {
            h += '<tr class="row-governing"><td colspan="7" style="text-align:right;"><b>复合场景合计 f_C = Σ f_Cn</b></td>' +
                 '<td class="num"><b>' + lpSci(D.sumFc) + '</b></td><td>' +
                 (D.pass ? '<span class="badge badge-green">满足</span>' : '<span class="badge badge-red">不满足</span>') + '</td></tr>';
        }
        h += '</tbody>';
        document.getElementById('lpSummaryTable').innerHTML = h;

        /* --- 公式说明 --- */
        var fn = '';
        if (D.method === 'multi') {
            fn = '<b>采用复合场景分析法（公式 3）</b>：f_C = Σ<sub>n=1..N</sub> [ f_In × P_En × P_Cn × ∏<sub>j=1..J</sub> PFD_nj ]。' +
                 '对导致同一后果的多个独立场景求和，结果比单一场景分析法更保守。';
            if (D.results.length > 1) {
                fn += ' 本风险点共 ' + D.results.length + ' 个场景，合计 f_C = ' + lpSci(D.sumFc) + ' 次/年。';
            }
        } else {
            fn = '<b>采用单一场景分析法（公式 2）</b>：f_Cn = f_In × P_En × P_Cn × ∏<sub>j=1..J</sub> PFD_nj。' +
                 '各场景分别计算后取最高值作为该风险点的代表性后果频率。';
            if (D.results.length > 1) {
                fn += ' 本风险点共 ' + D.results.length + ' 个场景，控制场景为场景 ' + (D.maxIdx + 1) +
                      '（f_Cn = ' + lpSci(D.maxFc) + ' 次/年）。';
            }
        }
        var highScenes = D.scen.filter(function (x) { return x.mode === 'high'; }).length;
        if (highScenes) {
            fn += '<br><b>高要求模式</b>：共 ' + highScenes + ' 个场景按附录 E 计算。' +
                  '标准 E.1 指出，公式（3）（4）（5）仅适用于低要求模式，用于高要求模式将导致不精确的后果发生频率值，一般情况下其结果远大于实际值。';
        }
        document.getElementById('lpFormulaNote').innerHTML = fn;

        /* --- 风险矩阵 --- */
        var hit = lpMatrixHit(D.govFc);
        var hitLevel = (hit !== null && hit >= 0) ? D.level : null;
        lpRenderMatrix(document.getElementById('lpMatrix'), hitLevel, hit);
        document.getElementById('lpActionBox').innerHTML = lpActionBoxHtml(hit, D.level, D.govFc);
    }

    function lpActionBoxHtml(hit, level, freq) {
        if (hit === -2) {
            return '<div class="lp-action-box now"><i class="fa-solid fa-triangle-exclamation"></i>' +
                   '后果频率 ' + lpSci(freq) + ' 次/年 已超出表 A.9 矩阵上限（10⁰），必须重新进行场景识别与保护层设计，并立即采取行动（通知公司）。</div>';
        }
        if (hit === -3) {
            return '<div class="lp-action-box none"><i class="fa-solid fa-circle-check"></i>' +
                   '后果频率 ' + lpSci(freq) + ' 次/年 低于表 A.9 矩阵下限（10⁻⁷），处于矩阵最低风险区，按示例矩阵不需采取行动。</div>';
        }
        if (hit === null) return '';
        var kind = LP_MX_ROWS[hit][level - 1];
        return '<div class="lp-action-box ' + kind + '"><i class="fa-solid ' +
               (kind === 'none' ? 'fa-circle-check' : kind === 'opt' ? 'fa-circle-info' : 'fa-bell') + '"></i>' +
               '表 A.9 行动要求（后果等级 ' + level + ' 级 × 后果频率 ' + LP_MX_BANDS[hit].label + '）：' +
               lpEsc(LP_MX_TEXT[kind]) + '</div>';
    }

    function lpRenderMatrix(tbl, hitLevel, hitRow) {
        if (!tbl) return;
        var h = '<thead><tr><th class="lp-mx-corner">后果频率 \\ 后果等级</th>';
        for (var lv = 1; lv <= 5; lv++) h += '<th>等级 ' + lv + '</th>';
        h += '</tr></thead><tbody>';
        for (var i = 0; i < LP_MX_BANDS.length; i++) {
            h += '<tr><td class="lp-mx-freq">' + LP_MX_BANDS[i].label + '</td>';
            for (var c = 1; c <= 5; c++) {
                var k = LP_MX_ROWS[i][c - 1];
                var cls = 'lp-mx-' + k;
                var hover = LP_MX_TEXT[k];
                if (hitRow === i && hitLevel === c) cls += ' lp-mx-hit';
                h += '<td class="' + cls + '" title="' + lpEsc(hover) + '">' + lpEsc(hover) + '</td>';
            }
            h += '</tr>';
        }
        h += '</tbody>';
        tbl.innerHTML = h;
    }

    /* ============================================================
       9. 合规校验
       ============================================================ */
    function lpBuildChecks() {
        var D = LP_LAST;
        var out = [];
        function add(kind, txt, ref) { out.push({ kind: kind, txt: txt, ref: ref }); }

        /* 9.1 使能条件约束 7.5.2.1 */
        var peBad = [], peTooSmall = [];
        D.scen.forEach(function (s) {
            var pe = isNaN(s.pe) ? 1 : s.pe;
            if (pe < 0.1) peBad.push('场景 ' + s.no + '（P_E = ' + lpSci(pe) + '）');
            if (pe > 0 && pe < 0.01) peTooSmall.push('场景 ' + s.no);
        });
        if (peBad.length) {
            add('warn', '以下场景的单一使能条件取值低于 0.1：' + peBad.join('、') +
                '。除非有特别有效数据支持，单一使能条件取值不宜低于 0.1。', '7.5.2.1');
        } else {
            add('ok', '所有场景的单一使能条件取值均不低于 0.1。', '7.5.2.1');
        }
        if (D.scen.length > 1 && peBad.length) {
            add('warn', '请复核多使能条件场景的乘积是否小于 0.01（标准要求单一场景中使用所有使能条件取值的乘积不宜小于 0.01）。本工具每场景仅设一个 P_E 输入框，多使能条件请先自行相乘后填入。', '7.5.2.1');
        }

        /* 9.2 修正因子约束 7.6.2.2 */
        var pcBad = [];
        D.scen.forEach(function (s) {
            var pc = isNaN(s.pc) ? 1 : s.pc;
            if (pc < 0.01) pcBad.push('场景 ' + s.no + '（P_C = ' + lpSci(pc) + '）');
        });
        if (pcBad.length) {
            add('warn', '以下场景的修正因子乘积低于 0.01：' + pcBad.join('、') +
                '。标准规定单一场景中使用的所有修正因子取值的乘积不宜小于 0.01。', '7.6.2.2');
        } else {
            add('ok', '所有场景的修正因子乘积均不低于 0.01。', '7.6.2.2');
        }

        /* 9.3 独立保护层合规性 */
        var badIpl = [];
        D.scen.forEach(function (s) {
            s.ipls.forEach(function (x) {
                var nm = x.name || '';
                for (var i = 0; i < LP_BAD_IPL_KW.length; i++) {
                    if (nm.indexOf(LP_BAD_IPL_KW[i]) !== -1) { badIpl.push('场景 ' + s.no + '「' + nm + '」（命中“' + LP_BAD_IPL_KW[i] + '”）'); break; }
                }
            });
        });
        if (badIpl.length) {
            add('bad', '以下措施被列为独立保护层，但标准明确“不宜作为独立保护层”：' + badIpl.join('、') +
                '。培训和取证、操作规程、定期的测试和检测、维修维护、警示标识均不宜作为 IPL，请移入“保护措施（非独立保护层）”栏。', '7.7.1');
        } else {
            add('ok', '未发现将“培训/取证、操作规程、定期测试检测、维修维护、警示标识”列为独立保护层的情形。', '7.7.1');
        }

        /* 9.4 BPCS 回路数量 A.5 */
        D.scen.forEach(function (s) {
            var n = s.ipls.filter(function (x) { return x.typeIdx >= 0 && LP_IPL[x.typeIdx] && LP_IPL[x.typeIdx].n.indexOf('BPCS') !== -1; }).length;
            if (n > 2) {
                add('bad', '场景 ' + s.no + ' 中同一 BPCS 的功能回路被列为 ' + n + ' 个独立保护层。标准规定：同一场景下作为 IPL 的 BPCS 回路不能超过 2 个。', '附录 A.5.2');
            } else if (n === 2) {
                add('warn', '场景 ' + s.no + ' 中同一 BPCS 的两个回路同时作为 IPL，须满足：① BPCS 具有完善的安全访问程序；② 传感器与最终元件在 BPCS 回路所有部件中具有最高失效概率值；③ 两回路不共享传感器、最终元件、输入卡或输出卡；④ 使用方法 B 时须证明逻辑解算器 PFD 比回路其他部件至少低两个数量级。不满足时应改用方法 A（仅 1 个 IPL）。', '附录 A.5.2 / A.5.3');
            } else if (n === 1) {
                add('ok', '场景 ' + s.no + ' 中仅 1 个 BPCS 回路作为 IPL，符合方法 A 的保守要求。', '附录 A.5.1');
            }
        });

        /* 9.5 初始事件合规性 */
        var badIe = [];
        D.scen.forEach(function (s) {
            var nm = s.ieName || '';
            for (var i = 0; i < LP_BAD_IE_KW.length; i++) {
                if (nm.indexOf(LP_BAD_IE_KW[i]) !== -1) { badIe.push('场景 ' + s.no + '「' + nm + '」'); break; }
            }
        });
        if (badIe.length) {
            add('bad', '以下初始事件疑似属于标准明确“不宜作为初始事件”的情形：' + badIe.join('、') +
                '。操作人员培训不充分、测试或检查不完善、物理保护功能失效（如安全阀等）不宜作为初始事件，请追溯至分析对象范围内最初始原因。', '7.4.2 f)');
        } else {
            add('ok', '未发现“培训不充分、测试/检查不完善、物理保护功能失效”被用作初始事件的情形。', '7.4.2 f)');
        }

        /* 9.6 高要求模式判定 */
        var hd = [];
        D.scen.forEach(function (s) {
            if (s.mode !== 'high' && !isNaN(s.fi) && s.fi > 1) hd.push('场景 ' + s.no + '（f_I = ' + lpSci(s.fi) + ' 次/年）');
        });
        if (hd.length) {
            add('warn', '以下场景的初始事件频率大于 1 次/年，属于高要求模式，但当前按低要求模式（公式 2）计算：' + hd.join('、') +
                '。标准 E.1 指出公式（2）（3）（4）（5）仅适用于低要求模式，用于高要求模式将导致结果远大于实际值，请改用附录 E。', '附录 E.1');
        } else {
            add('ok', '未发现初始事件频率大于 1 次/年却按低要求模式计算的场景。', '附录 E.1');
        }

        /* 9.7 安全阀/物理保护作为 IPL 的能力确认 */
        var psv = [];
        D.scen.forEach(function (s) {
            s.ipls.forEach(function (x) {
                if (x.name && (x.name.indexOf('安全阀') !== -1 || x.name.indexOf('爆破片') !== -1)) psv.push('场景 ' + s.no + '「' + x.name + '」');
            });
        });
        if (psv.length) {
            add('warn', '以下独立保护层为物理保护（释放措施）：' + psv.join('、') +
                '。须确认其泄放通量不小于计算场景物料的泄放量、泄放罐容量满足要求，且设计、维护和尺寸合适；否则不能作为该场景的独立保护层，并需在分析表中给出说明。', '7.7.1 a) 注');
        }

        /* 9.8 后果描述是否描述至最终后果 */
        var cd = D.meta.consDesc || '';
        if (!cd) {
            add('bad', '后果描述为空。标准要求逐项分析后果严重性，并将后果分析至最终后果。', '7.3.1 b)');
        } else if (/安全阀动作|压缩机停机|联锁动作|停车|报警/.test(cd) && cd.length < 30) {
            add('warn', '后果描述疑似停留在“安全阀动作/停机/报警”等中间事件，而非最终不利可信后果。标准 7.3.1 注 1 明确此类描述不符合要求。', '7.3.1 b) 注 1');
        } else {
            add('ok', '后果描述已填写，请人工确认其描述的是“假设所有已有保护措施都失效时导致的最终不利可信后果”。', '7.3.1 b) c)');
        }

        /* 9.9 可容忍风险取值一致性 */
        if (Math.abs(D.ft - D.ftStd) > 1e-15) {
            add('warn', '可容忍风险频率已被手动修改为 ' + lpSci(D.ft) + ' 次/年，与表 A.10/A.11/A.12 中 ' + D.level + ' 级的示例值 ' + lpSci(D.ftStd) +
                ' 次/年不一致。标准要求需表明所使用假定值的参考依据，且对标准值的任何修改需说明理由并记录在案。', '7.6.2.2 注');
        } else {
            add('ok', '可容忍风险频率与所选表（' + LP_TOL[D.ctg].name + '）' + D.level + ' 级的示例值一致。', '表 A.10 / A.11 / A.12');
        }

        /* 9.10 场景数量与分析结论 */
        add('ok', '本次共分析 ' + D.scen.length + ' 个场景，其中 ' +
            D.results.filter(function (r) { return r.fc <= D.ft; }).length + ' 个满足可容忍风险标准，共识别独立保护层 ' +
            D.scen.reduce(function (a, s) { return a + s.ipls.length; }, 0) + ' 项。', '第 8 章');
        add('warn', '标准要求每个场景的初始事件应追溯至分析对象范围内最初始原因，并识别和审查所有操作模式（正常运行、开车、停车、设备停电）和设备状态（待机、维护）下的初始事件；同时需确认 HAZOP 等前置分析中提出的已有保护措施是否有遗漏。请人工复核。', '7.4.2 b) c) d) · 7.7.1');

        return out;
    }

    /* ============================================================
       10. LOPA 记录表（第 8 章 a~l 项）
       ============================================================ */
    function lpBuildRecord() {
        var D = LP_LAST;
        if (!D) return;
        var m = D.meta;
        var sil = lpSilAdvice(D.needPfd);
        var h = '';

        /* 表头 */
        h += '<thead><tr><th colspan="3" style="text-align:center;background:var(--space-gray);color:#fff;">LOPA 记录表（GB/T 32857-2025 第 8 章）</th></tr></thead><tbody>';
        h += '<tr><td class="lp-rec-k">风险点编号</td><td colspan="2">' + (lpEsc(m.nodeNo) || '<span class="lp-placeholder">—</span>') + '</td></tr>';
        h += '<tr><td class="lp-rec-k">风险点名称</td><td colspan="2">' + (lpEsc(m.nodeName) || '<span class="lp-placeholder">—</span>') + '</td></tr>';
        h += '<tr><td class="lp-rec-k">分析方法</td><td colspan="2">' +
             (D.method === 'multi' ? '复合场景分析法（公式 3 / 6）' : '单一场景分析法（公式 2 / 5）') +
             ' · 后果类型：' + lpEsc(LP_TOL[D.ctg].name) + '</td></tr>';
        h += '<tr><td class="lp-rec-k">分析人 / 小组</td><td colspan="2">' + (lpEsc(m.analyst) || '<span class="lp-placeholder">—</span>') + '</td></tr>';
        h += '<tr><td class="lp-rec-k">日期</td><td colspan="2">' + (lpEsc(m.date) || '<span class="lp-placeholder">—</span>') + '</td></tr>';

        /* a) 后果 */
        h += '<tr class="lp-rec-sec"><td colspan="3">a) 后果</td></tr>';
        h += '<tr><td class="lp-rec-k">后果描述 <small>a)</small></td><td colspan="2">' +
             (lpEsc(m.consDesc).replace(/\n/g, '<br>') || '<span class="lp-placeholder">—</span>') + '</td></tr>';
        h += '<tr><td class="lp-rec-k">后果等级 <small>7.3.2</small></td><td colspan="2"><b>' + D.level + ' 级</b>：' +
             lpEsc(LP_CONS[D.ctg].levels[D.level]).replace(/\n/g, '<br>') + '</td></tr>';
        if (m.initRisk) {
            h += '<tr><td class="lp-rec-k">原始风险 <small>3.5</small></td><td colspan="2">' + lpEsc(m.initRisk) + '</td></tr>';
        }

        /* b) 可容忍风险标准 */
        h += '<tr class="lp-rec-sec"><td colspan="3">b) 可容忍风险标准</td></tr>';
        h += '<tr><td class="lp-rec-k">f_t <small>表 A.10/11/12</small></td><td colspan="2">' + lpSci(D.ft) + ' 次/年' +
             (Math.abs(D.ft - D.ftStd) > 1e-15 ? '（手动覆盖，标准示例值 ' + lpSci(D.ftStd) + ' 次/年）' : '') + '</td></tr>';

        /* 逐场景 */
        for (var i = 0; i < D.scen.length; i++) {
            var s = D.scen[i], r = D.results[i];
            h += '<tr class="lp-rec-sec"><td colspan="3">场景 ' + (i + 1) +
                 (s.name ? '：' + lpEsc(s.name) : '') +
                 (s.mode === 'high' ? '（高要求模式·附录 E）' : '') + '</td></tr>';

            /* 描述 | 概率 | 频率 三列 */
            h += '<tr><td class="lp-rec-k">描述</td><td>概率</td><td style="width:150px;">频率（次/年）</td></tr>';

            h += '<tr><td class="lp-rec-k">c) 初始事件 <small>7.4</small></td>' +
                 '<td>' + (lpEsc(s.ieName) || '<span class="lp-placeholder">—</span>') +
                 (s.ieIdx !== '' && LP_IE[parseInt(s.ieIdx, 10)] ?
                    '（表 A.13 参考范围 ' + lpSci(LP_IE[parseInt(s.ieIdx, 10)].r[0]) + '~' + lpSci(LP_IE[parseInt(s.ieIdx, 10)].r[1]) + '）' : '') + '</td>' +
                 '<td>' + lpSci(s.fi) + '</td></tr>';

            h += '<tr><td class="lp-rec-k">d) 使能事件或使能条件 <small>7.5</small></td>' +
                 '<td>P_E ' + (s.mode === 'high' ? '（高要求模式下已并入基准频率，见 E.3）' : '') + '</td>' +
                 '<td>' + lpSci(r.pe) + '</td></tr>';

            h += '<tr><td class="lp-rec-k">e) 条件修正 <small>7.6</small></td>' +
                 '<td>P_C' + (r.baseHow ? '（公式 ' + r.baseHow + '）' : '') + '</td>' +
                 '<td>' + lpSci(r.pc) + '</td></tr>';

            /* f) 独立保护层 */
            if (s.ipls.length) {
                for (var j = 0; j < s.ipls.length; j++) {
                    var x = s.ipls[j];
                    var isFirstHigh = (s.mode === 'high' && j === 0);
                    h += '<tr><td class="lp-rec-k">' + (j === 0 ? 'f) 独立保护层 <small>7.7</small>' : '') + '</td>' +
                         '<td>' + (lpEsc(x.name) || '(未命名)') +
                         (x.typeIdx >= 0 && LP_IPL[x.typeIdx] ? '（' + lpEsc(LP_IPL[x.typeIdx].n) + '）' : '') +
                         (isFirstHigh ? ' <span class="badge badge-amber">高要求模式基准 IPL</span>' : '') + '</td>' +
                         '<td>' + lpSci(x.pfd) + '</td></tr>';
                }
            } else {
                h += '<tr><td class="lp-rec-k">f) 独立保护层 <small>7.7</small></td><td class="lp-placeholder">无</td><td>1</td></tr>';
            }

            /* g) 保护措施（非 IPL） */
            h += '<tr><td class="lp-rec-k">g) 保护措施（非 IPL）</td><td colspan="2">' +
                 (lpEsc(s.nonIpl).replace(/\n/g, '<br>') || '<span class="lp-placeholder">—</span>') + '</td></tr>';

            /* h) 后果频率 */
            h += '<tr><td class="lp-rec-k">h) 后果频率 <small>' + (s.mode === 'high' ? '附录 E' : '公式 2') + '</small></td>' +
                 '<td class="lp-placeholder" style="font-family:var(--font-mono);font-size:var(--fs-xs);">' + lpEsc(r.formula || '') + '</td>' +
                 '<td><b>' + lpSci(r.fc) + '</b></td></tr>';

            /* i) 是否满足 */
            var ok = r.fc <= D.ft;
            h += '<tr><td class="lp-rec-k">i) 能否满足可容忍风险标准</td><td colspan="2">' +
                 (ok ? '<span class="badge badge-green">满足</span> 后果频率 ' + lpSci(r.fc) + ' ≤ f_t ' + lpSci(D.ft)
                     : '<span class="badge badge-red">不满足</span> 后果频率 ' + lpSci(r.fc) + ' > f_t ' + lpSci(D.ft)) +
                 '</td></tr>';

            /* j) 行动 */
            if (ok) {
                h += '<tr><td class="lp-rec-k">j) 需采取的行动</td><td colspan="2">按照 7.10 b)，当前设置已满足风险降低要求，无需补充独立保护层。' +
                     '建议保持现有 IPL 的功能测试、维护与变更管理。</td></tr>';
            } else {
                h += '<tr><td class="lp-rec-k">j) 需采取的行动</td><td colspan="2">' +
                     '按 7.10 c)，须补充保护措施使后果频率降至 f_t 以下。' +
                     '所需新增保护层 PFD ≤ <b>' + lpSci(D.ft / r.fc) + '</b>；本场景 RRF = ' + (r.fc / D.ft).toPrecision(4).replace(/0+$/, '').replace(/\.$/, '') + '。' +
                     '建议 SIL：<b>' + lpEsc(lpSilAdvice(D.ft / r.fc).sil) + '</b>。' +
                     '须明确措施负责人与预计行动完成日期。</td></tr>';
            }

            /* k) 备注 */
            var noteParts = [];
            if (r.note) noteParts.push(r.note);
            if (s.ipls.length === 0) noteParts.push('本场景未识别到独立保护层。');
            h += '<tr><td class="lp-rec-k">k) 备注</td><td colspan="2">' +
                 (noteParts.length ? lpEsc(noteParts.join(' ')) : '<span class="lp-placeholder">—</span>') + '</td></tr>';
            h += '<tr><td class="lp-rec-k">l) 参考资料</td><td colspan="2">GB/T 32857-2025《保护层分析（LOPA）应用导则》；' +
                 '表 A.4 / A.5 / A.6（后果分级）、表 A.8（IPL PFD）、表 A.10 / A.11 / A.12（可容忍风险）、表 A.13（初始事件频率）</td></tr>';
        }

        /* 总体结论 */
        h += '<tr class="lp-rec-sec"><td colspan="3">风险评估与建议（7.10）</td></tr>';
        h += '<tr><td class="lp-rec-k">' + (D.method === 'multi' ? '复合场景 f_C' : '控制场景 f_Cn') + '</td>' +
             '<td colspan="2"><b>' + lpSci(D.govFc) + '</b> 次/年' +
             (D.method === 'single' && D.scen.length > 1 ? '（场景 ' + (D.maxIdx + 1) + '）' : '') + '</td></tr>';
        h += '<tr><td class="lp-rec-k">RRF <small>公式 ' + (D.method === 'multi' ? '6' : '5') + '</small></td>' +
             '<td colspan="2">' + (isFinite(D.rrf) ? D.rrf.toPrecision(4).replace(/0+$/, '').replace(/\.$/, '') : '—') + '</td></tr>';
        h += '<tr><td class="lp-rec-k">结论</td><td colspan="2">' +
             (D.pass ? '<b>满足</b>可容忍风险标准。' : '<b>不满足</b>可容忍风险标准，需采取行动（' + lpEsc(sil.sil) + '）。' + lpEsc(sil.text)) +
             '</td></tr>';
        var hit = lpMatrixHit(D.govFc);
        if (hit !== null && hit >= 0) {
            h += '<tr><td class="lp-rec-k">风险矩阵行动要求 <small>表 A.9</small></td><td colspan="2">' +
                 lpEsc(LP_MX_TEXT[LP_MX_ROWS[hit][D.level - 1]]) + '（后果等级 ' + D.level + ' 级 × ' + LP_MX_BANDS[hit].label + '）</td></tr>';
        } else if (hit === -2) {
            h += '<tr><td class="lp-rec-k">风险矩阵行动要求 <small>表 A.9</small></td><td colspan="2">后果频率超出矩阵上限，立即采取行动（通知公司）。</td></tr>';
        } else if (hit === -3) {
            h += '<tr><td class="lp-rec-k">风险矩阵行动要求 <small>表 A.9</small></td><td colspan="2">低于矩阵下限，按示例矩阵不需采取行动。</td></tr>';
        }
        h += '</tbody>';

        document.getElementById('lpRecTable').innerHTML = h;

        /* 合规校验 */
        var checks = lpBuildChecks();
        var cl = '';
        for (var q = 0; q < checks.length; q++) {
            var c = checks[q];
            var icon = c.kind === 'ok' ? 'fa-circle-check' : (c.kind === 'warn' ? 'fa-circle-exclamation' : 'fa-circle-xmark');
            cl += '<li class="lp-ck-' + c.kind + '"><i class="fa-solid ' + icon + '"></i>' +
                  '<span class="lp-ck-body">' + lpEsc(c.txt) + '<span class="lp-ck-ref">依据：GB/T 32857-2025 ' + lpEsc(c.ref) + '</span></span></li>';
        }
        document.getElementById('lpCheckList').innerHTML = cl;
    }

    /* ============================================================
       11. 导出 / 打印 / 重置
       ============================================================ */
    function lpBuildDocBody() {
        var D = LP_LAST;
        var m = D.meta;
        var sil = lpSilAdvice(D.needPfd);
        var s = '';
        s += '<h2 style="text-align:center;margin:0 0 6px;">保护层分析（LOPA）报告</h2>';
        s += '<p style="text-align:center;font-size:12px;color:#555;margin:0 0 16px;">依据 GB/T 32857-2025《保护层分析（LOPA）应用导则》 · SHEEN Toolbox</p>';

        s += '<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%;font-size:12px;">';
        s += '<tr><td style="width:110px;background:#f5f5f5;"><b>风险点编号</b></td><td>' + (lpEsc(m.nodeNo) || '—') + '</td>' +
             '<td style="width:110px;background:#f5f5f5;"><b>风险点名称</b></td><td>' + (lpEsc(m.nodeName) || '—') + '</td></tr>';
        s += '<tr><td style="background:#f5f5f5;"><b>分析方法</b></td><td>' + (D.method === 'multi' ? '复合场景分析法（公式 3 / 6）' : '单一场景分析法（公式 2 / 5）') + '</td>' +
             '<td style="background:#f5f5f5;"><b>后果类型</b></td><td>' + lpEsc(LP_TOL[D.ctg].name) + '</td></tr>';
        s += '<tr><td style="background:#f5f5f5;"><b>分析人 / 小组</b></td><td>' + (lpEsc(m.analyst) || '—') + '</td>' +
             '<td style="background:#f5f5f5;"><b>日期</b></td><td>' + (lpEsc(m.date) || '—') + '</td></tr>';
        s += '<tr><td style="background:#f5f5f5;"><b>后果描述</b></td><td colspan="3">' + (lpEsc(m.consDesc).replace(/\n/g, '<br>') || '—') + '</td></tr>';
        s += '<tr><td style="background:#f5f5f5;"><b>后果等级</b></td><td colspan="3"><b>' + D.level + ' 级</b>：' + lpEsc(LP_CONS[D.ctg].levels[D.level]).replace(/\n/g, '<br>') + '</td></tr>';
        s += '<tr><td style="background:#f5f5f5;"><b>可容忍风险 f_t</b></td><td colspan="3">' + lpSci(D.ft) + ' 次/年</td></tr>';
        s += '</table>';

        /* 场景明细 */
        s += '<h3 style="margin:18px 0 8px;font-size:14px;">场景明细</h3>';
        s += '<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%;font-size:11px;">';
        s += '<tr style="background:#f5f5f5;"><th>场景</th><th>描述</th><th>初始事件</th><th>f_I</th><th>P_E</th><th>P_C</th>' +
             '<th>独立保护层（PFD）</th><th>f_Cn</th><th>是否满足</th></tr>';
        for (var i = 0; i < D.scen.length; i++) {
            var sc = D.scen[i], r = D.results[i];
            var iplTxt = sc.ipls.length ? sc.ipls.map(function (x) { return lpEsc(x.name || '(未命名)') + '(' + lpSci(x.pfd) + ')'; }).join('<br>') : '无';
            s += '<tr><td style="text-align:center;">' + (i + 1) + (sc.mode === 'high' ? '<br>(附录E)' : '') + '</td>' +
                 '<td>' + (lpEsc(sc.name) || '—') + '</td>' +
                 '<td>' + (lpEsc(sc.ieName) || '—') + '</td>' +
                 '<td style="text-align:right;">' + lpSci(sc.fi) + '</td>' +
                 '<td style="text-align:right;">' + lpSci(r.pe) + '</td>' +
                 '<td style="text-align:right;">' + lpSci(r.pc) + '</td>' +
                 '<td>' + iplTxt + '</td>' +
                 '<td style="text-align:right;"><b>' + lpSci(r.fc) + '</b></td>' +
                 '<td style="text-align:center;">' + (r.fc <= D.ft ? '满足' : '不满足') + '</td></tr>';
        }
        if (D.method === 'multi') {
            s += '<tr style="background:#FDEEF1;"><td colspan="7" style="text-align:right;"><b>复合场景合计 f_C = Σ f_Cn</b></td>' +
                 '<td style="text-align:right;"><b>' + lpSci(D.sumFc) + '</b></td><td style="text-align:center;">' + (D.pass ? '满足' : '不满足') + '</td></tr>';
        }
        s += '</table>';

        /* 结论 */
        s += '<h3 style="margin:18px 0 8px;font-size:14px;">结论与建议（7.10）</h3>';
        s += '<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%;font-size:12px;">';
        s += '<tr><td style="width:170px;background:#f5f5f5;"><b>' + (D.method === 'multi' ? '复合场景 f_C' : '控制场景 f_Cn') + '</b></td><td>' + lpSci(D.govFc) + ' 次/年</td></tr>';
        s += '<tr><td style="background:#f5f5f5;"><b>RRF（公式 ' + (D.method === 'multi' ? '6' : '5') + '）</b></td><td>' + (isFinite(D.rrf) ? D.rrf.toPrecision(4) : '—') + '</td></tr>';
        s += '<tr><td style="background:#f5f5f5;"><b>结论</b></td><td>' +
             (D.pass ? '<b>满足</b>可容忍风险标准，无需补充独立保护层。'
                     : '<b>不满足</b>可容忍风险标准。所需新增保护层 PFD ≤ ' + lpSci(D.needPfd) + '；建议 SIL：<b>' + lpEsc(sil.sil) + '</b>。' + lpEsc(sil.text)) +
             '</td></tr>';
        var hit2 = lpMatrixHit(D.govFc);
        if (hit2 !== null && hit2 >= 0) {
            s += '<tr><td style="background:#f5f5f5;"><b>风险矩阵行动要求</b></td><td>' +
                 lpEsc(LP_MX_TEXT[LP_MX_ROWS[hit2][D.level - 1]]) + '</td></tr>';
        }
        s += '</table>';

        /* 合规校验 */
        var checks = lpBuildChecks();
        s += '<h3 style="margin:18px 0 8px;font-size:14px;">标准合规自检</h3>';
        s += '<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%;font-size:11px;">';
        for (var q = 0; q < checks.length; q++) {
            var c = checks[q];
            var tag = c.kind === 'ok' ? '符合' : (c.kind === 'warn' ? '需复核' : '不符合');
            s += '<tr><td style="width:60px;text-align:center;">' + tag + '</td><td>' + lpEsc(c.txt) +
                 '<br><span style="color:#777;">依据：GB/T 32857-2025 ' + lpEsc(c.ref) + '</span></td></tr>';
        }
        s += '</table>';

        /* 附：LOPA 记录表（第 8 章 a~l 项） */
        s += '<h3 style="margin:18px 0 8px;font-size:14px;">LOPA 记录表（第 8 章）</h3>';
        var rec = document.getElementById('lpRecTable');
        if (rec) {
            s += rec.outerHTML
                .replace(/class="[^"]*"/g, '')
                .replace(/id="[^"]*"/g, '')
                .replace('<table', '<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%;font-size:11px;"');
        }
        return s;
    }

    function lpExport(type) {
        if (!LP_LAST) { alert('请先点击「计算」生成结果后再导出。'); return; }
        var body = lpBuildDocBody();
        var nm = LP_LAST.meta.nodeName || '风险点';
        var fname = 'LOPA分析_' + nm.replace(/[\\/:*?"<>|]/g, '_') + '_' + lpCnTime().date;
        var doc = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns="http://www.w3.org/TR/REC-html40">' +
                  '<head><meta charset="UTF-8"><title>' + lpEsc(fname) + '</title></head><body>' +
                  body +
                  '<p style="margin-top:18px;font-size:11px;color:#777;">' +
                  '本报告由 SHEEN Toolbox · 保护层分析（LOPA）工具 依据 GB/T 32857-2025《保护层分析（LOPA）应用导则》生成，仅供内部分析与参考。' +
                  '标准中的后果分级、可容忍风险、IPL PFD 与初始事件频率均为附录 A 的<b>资料性示例</b>，' +
                  '实际取值须符合国家标准、行业标准或企业标准，并经分析小组共同确认。' +
                  '打印时间：' + lpCnTime().str + '（北京时间）</p>' +
                  '</body></html>';
        var mime = (type === 'xls') ? 'application/vnd.ms-excel' : 'application/msword';
        var blob = new Blob(['\ufeff' + doc], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = fname + '.' + (type === 'xls' ? 'xls' : 'doc');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    function lpPrint() {
        window.print();
    }

    function lpReset() {
        if (!confirm('确定要清空所有输入并重新开始吗？')) return;
        document.getElementById('lpNodeNo').value = '';
        document.getElementById('lpNodeName').value = '';
        document.getElementById('lpAnalyst').value = '';
        document.getElementById('lpDate').value = lpCnTime().date;
        document.getElementById('lpConsDesc').value = '';
        document.getElementById('lpInitRisk').value = '';
        document.getElementById('lpConsLevel').value = '3';
        document.querySelector('input[name="lpCtg"][value="safety"]').checked = true;
        document.querySelector('input[name="lpMethod"][value="single"]').checked = true;
        ['lpCtgRow', 'lpMethodRow'].forEach(function (id) {
            var box = document.getElementById(id);
            var ls = box.querySelectorAll('label');
            for (var i = 0; i < ls.length; i++) {
                var inp = ls[i].querySelector('input');
                ls[i].classList.toggle('on', !!(inp && inp.checked));
            }
        });
        lpFtManual = false;
        document.getElementById('lpFt').value = '';
        document.getElementById('lpScenarios').innerHTML = '';
        lpScenSeq = 0;
        lpAddScenario();
        lpOnLevelChange();
        LP_LAST = null;
        document.getElementById('lpResultWrap').style.display = 'none';
        /* 重置 = 清空本地存档，避免刷新后又恢复旧输入 */
        try { localStorage.removeItem(LP_STORE_KEY); } catch (e) {}
        lpSaveHint('已清空');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* 场景区内 PFD / 名称 / 高要求模式基准输入变化 → 仅刷新小计 */
    function lpBindScenarioLiveRecalc() {
        var el = document.getElementById('lpScenarios');
        if (!el) return;
        el.addEventListener('input', function (e) {
            var t = e.target;
            if (t && t.classList && (
                t.classList.contains('lp-ipl-pfd') || t.classList.contains('lp-ipl-name') ||
                t.classList.contains('lp-ipl1f') || t.classList.contains('lp-ti'))) {
                lpLiveRecalc();
            }
        });
    }

    /* ============================================================
       11.5 本地持久化（localStorage）
       ------------------------------------------------------------
       与 PHA 主机页共用 localStorage，但使用独立键 sheen_lopa_v1，
       互不覆盖。快照 = 头部字段 + 全部场景（含 IPL 行）。
       保存时机：任何输入变化后 600ms 节流；重置时清空。
       ============================================================ */

    /* 采集当前状态 → 可 JSON 化的普通对象 */
    function lpSnapshot() {
        var meta = {
            nodeNo: (document.getElementById('lpNodeNo') || {}).value || '',
            nodeName: (document.getElementById('lpNodeName') || {}).value || '',
            analyst: (document.getElementById('lpAnalyst') || {}).value || '',
            date: (document.getElementById('lpDate') || {}).value || '',
            consDesc: (document.getElementById('lpConsDesc') || {}).value || '',
            initRisk: (document.getElementById('lpInitRisk') || {}).value || '',
            consLevel: (document.getElementById('lpConsLevel') || {}).value || '3',
            ft: (document.getElementById('lpFt') || {}).value || '',
            ctg: lpGetCtg(),
            method: lpGetMethod()
        };
        var scen = [];
        var cards = document.querySelectorAll('#lpScenarios .lp-sc');
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            var ipls = [];
            var trs = c.querySelectorAll('.lp-ipl-body tr');
            for (var j = 0; j < trs.length; j++) {
                var tr = trs[j];
                ipls.push({
                    name: ((tr.querySelector('.lp-ipl-name') || {}).value || '').trim(),
                    type: (tr.querySelector('.lp-ipl-type') || {}).value || '',
                    pfd: ((tr.querySelector('.lp-ipl-pfd') || {}).value || '').trim()
                });
            }
            scen.push({
                name: ((c.querySelector('.lp-sc-name') || {}).value || '').trim(),
                ie: ((c.querySelector('.lp-ie-sel') || {}).value || ''),
                ieName: ((c.querySelector('.lp-ie-name') || {}).value || '').trim(),
                fi: ((c.querySelector('.lp-ie-freq') || {}).value || '').trim(),
                pe: ((c.querySelector('.lp-pe') || {}).value || '').trim(),
                pc: ((c.querySelector('.lp-pc') || {}).value || '').trim(),
                mode: ((c.querySelector('.lp-mode') || {}).value || 'low'),
                ipl1f: ((c.querySelector('.lp-ipl1f') || {}).value || '').trim(),
                ti: ((c.querySelector('.lp-ti') || {}).value || '').trim(),
                nonIpl: ((c.querySelector('.lp-nonipl') || {}).value || ''),
                ipls: ipls
            });
        }
        return { v: 1, meta: meta, scen: scen, ftManual: lpFtManual };
    }

    /* 是否为「全空」状态——空状态不落盘，避免污染存储 */
    function lpIsBlank(snap) {
        if (!snap) return true;
        var m = snap.meta;
        var metaKeys = ['nodeNo', 'nodeName', 'analyst', 'consDesc', 'initRisk'];
        for (var i = 0; i < metaKeys.length; i++) {
            if (String(m[metaKeys[i]] || '').trim()) return false;
        }
        for (var k = 0; k < snap.scen.length; k++) {
            var s = snap.scen[k];
            if (s.name || s.ieName || s.fi || s.pe !== '1' || s.pc !== '1' ||
                s.mode !== 'low' || s.ipl1f || s.ti || s.nonipl || s.ipls.length) return false;
        }
        return true;
    }

    function lpSaveNow() {
        if (lpSuppressSave) return;
        try {
            var snap = lpSnapshot();
            if (lpIsBlank(snap)) { localStorage.removeItem(LP_STORE_KEY); return; }
            localStorage.setItem(LP_STORE_KEY, JSON.stringify(snap));
            lpSaveHint('已自动保存');
        } catch (e) { /* 隐私模式 / 配额满：静默失败，不影响使用 */ }
    }

    function lpScheduleSave() {
        if (lpSaveTimer) clearTimeout(lpSaveTimer);
        lpSaveTimer = setTimeout(function () { lpSaveTimer = null; lpSaveNow(); }, 600);
    }

    function lpSaveHint(msg) {
        var el = document.querySelector('.pha-lopa-host .lp-save-hint');
        if (!el) return;
        var t = new Date(Date.now() + 8 * 3600000).toISOString().slice(11, 16);
        el.textContent = msg + ' ' + t;
    }

    /* 从快照恢复：先清空场景区，再按快照重建 */
    function lpRestore() {
        var raw = null;
        try { raw = localStorage.getItem(LP_STORE_KEY); } catch (e) { return false; }
        if (!raw) return false;
        var snap;
        try { snap = JSON.parse(raw); } catch (e) { return false; }
        if (!snap || snap.v !== 1 || !snap.meta || !Array.isArray(snap.scen)) return false;

        lpSuppressSave = true;
        try {
            var m = snap.meta;
            var setv = function (id, val) {
                var el = document.getElementById(id);
                if (el) el.value = val == null ? '' : String(val);
            };
            setv('lpNodeNo', m.nodeNo); setv('lpNodeName', m.nodeName);
            setv('lpAnalyst', m.analyst); setv('lpDate', m.date);
            setv('lpConsDesc', m.consDesc); setv('lpInitRisk', m.initRisk);

            var ctgR = document.querySelector('input[name="lpCtg"][value="' + m.ctg + '"]');
            if (ctgR) { ctgR.checked = true; }
            var metR = document.querySelector('input[name="lpMethod"][value="' + m.method + '"]');
            if (metR) { metR.checked = true; }
            ['lpCtgRow', 'lpMethodRow'].forEach(function (id) {
                var box = document.getElementById(id);
                if (!box) return;
                var ls = box.querySelectorAll('label');
                for (var i = 0; i < ls.length; i++) {
                    var inp = ls[i].querySelector('input');
                    ls[i].classList.toggle('on', !!(inp && inp.checked));
                }
            });

            /* 场景区重建 */
            var box2 = document.getElementById('lpScenarios');
            box2.innerHTML = '';
            lpScenSeq = 0;
            for (var i = 0; i < snap.scen.length; i++) {
                var s = snap.scen[i];
                lpAddScenario();
                var card = box2.querySelectorAll('.lp-sc')[box2.querySelectorAll('.lp-sc').length - 1];
                if (!card) continue;
                var sv = function (sel, val) {
                    var el = card.querySelector(sel);
                    if (el) el.value = val == null ? '' : String(val);
                };
                sv('.lp-sc-name', s.name);
                sv('.lp-ie-sel', s.ie);
                sv('.lp-ie-name', s.ieName);
                sv('.lp-ie-freq', s.fi);
                sv('.lp-pe', s.pe);
                sv('.lp-pc', s.pc);
                sv('.lp-mode', s.mode);
                sv('.lp-ipl1f', s.ipl1f);
                sv('.lp-ti', s.ti);
                sv('.lp-nonipl', s.nonipl);
                /* 初始事件 select 赋值不会触发 onchange → 手动同步提示与名称 */
                var ieSel = card.querySelector('.lp-ie-sel');
                if (ieSel && s.ie !== '') lpOnIePick(ieSel);
                sv('.lp-ie-name', s.ieName);
                sv('.lp-ie-freq', s.fi);
                /* IPL 行：默认已带 1 空行，按快照重建 */
                var iplBody = card.querySelector('.lp-ipl-body');
                if (iplBody) {
                    iplBody.innerHTML = '';
                    for (var j = 0; j < s.ipls.length; j++) {
                        var ip = s.ipls[j];
                        lpAddIpl(card.querySelector('.lp-add-btn'));
                        var tr = iplBody.querySelectorAll('tr')[iplBody.querySelectorAll('tr').length - 1];
                        if (!tr) continue;
                        var nv = tr.querySelector('.lp-ipl-name'); if (nv) nv.value = ip.name || '';
                        var tv = tr.querySelector('.lp-ipl-type'); if (tv) tv.value = ip.type == null ? '' : String(ip.type);
                        var pv = tr.querySelector('.lp-ipl-pfd'); if (pv) pv.value = ip.pfd || '';
                    }
                }
                /* 高要求模式字段显隐 */
                var modeSel = card.querySelector('.lp-mode');
                if (modeSel) lpOnModeChange(modeSel);
            }
            lpRenumber();

            /* ft：先按等级联动，再恢复用户手填值 */
            setv('lpConsLevel', m.consLevel);
            lpOnLevelChange();
            lpFtManual = !!snap.ftManual;
            if (snap.ftManual && m.ft) { var fte = document.getElementById('lpFt'); if (fte) fte.value = m.ft; }
        } finally {
            lpSuppressSave = false;
        }
        lpLiveRecalc();
        lpSaveHint('已恢复上次输入');
        return true;
    }

    /* 绑定自动保存：整页 input/change 事件委托 */
    function lpBindAutoSave() {
        var host = document.querySelector('.pha-lopa-host');
        if (!host) return;
        var handler = function () { lpScheduleSave(); };
        host.addEventListener('input', handler);
        host.addEventListener('change', handler);
    }

    /* ============================================================
       12. 启动
       ============================================================ */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            lpBindScenarioLiveRecalc();
            lpBindAutoSave();
            lpInit();
            lpRestore();
        });
    } else {
        lpBindScenarioLiveRecalc();
        lpBindAutoSave();
        lpInit();
        lpRestore();
    }
    