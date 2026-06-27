#!/usr/bin/env python3
"""标准化5Why页面：修复标题栏、图标、移动端布局兼容性"""

BASE = r'C:\Users\Leo\WorkBuddy\2026-06-21-10-55-16\sheen-toolbox-repo'

# ===== 5Why page specific fixes =====
fpath = f'{BASE}/five-why-analysis/index.html'

with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes_applied = []

# 1. Add inline style to shield icon (consistency with other pages)
old_icon = '<i class="fa-solid fa-shield-halved"></i>'
new_icon = '<i class="fa-solid fa-shield-halved" style="color:var(--amber);font-size:24px"></i>'
if old_icon in content and new_icon not in content:
    content = content.replace(old_icon, new_icon)
    fixes_applied.append('shield icon inline style')

# 2. Fix mobile nav: remove flex-direction:column (let flex-wrap handle layout)
# And remove gap:8px (not needed without column)
old_mobile = '.sheen-nav { padding:8px 12px; flex-direction:column; gap:8px; }'
new_mobile = '.sheen-nav { padding:8px 12px; }'
content = content.replace(old_mobile, new_mobile)
fixes_applied.append('mobile nav column to wrap')

# 3. Add page title above step indicator
# Look for: <main class="app-wrapper">\n  <div id="step-indicator"
page_title_html = '''<main class="app-wrapper">
  <h1 style="font-size:24px;font-weight:700;color:var(--text-primary);margin-bottom:8px;text-align:center;">
    <i class="fa-solid fa-magnifying-glass-chart" style="color:var(--brand-red);"></i> 5Why + 5M1E 根因分析
  </h1>
  <p style="font-size:14px;color:var(--text-secondary);text-align:center;margin-bottom:28px;line-height:1.6;">
    AI驱动的事故根因分析工具，结合5M1E维度分类+5Why深度追问，系统化溯源
  </p>
  <div id="step-indicator"'''
content = content.replace(
    '<main class="app-wrapper">\n  <div id="step-indicator"',
    page_title_html
)
fixes_applied.append('page title added')

# 4. Reduce card padding on mobile for better fit
old_card_mq = content.count('.card { padding:20px; }')
if old_card_mq == 0:
    # Add card padding reduction for mobile at the end of @media (max-width:768px) block
    content = content.replace(
        '  .app-wrapper { padding:16px; }\n  .matrix { grid-template-columns:repeat(2,1fr); }',
        '  .app-wrapper { padding:16px; }\n  .card { padding:20px; }\n  .matrix { grid-template-columns:repeat(2,1fr); }'
    )
    fixes_applied.append('mobile card padding')

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'5Why fixes: {fixes_applied}')
