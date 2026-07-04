#!/usr/bin/env python3
"""标准化灭火器计算器和安产费用计算器的导航栏为 sheen-nav 格式"""

import re

BASE = r'C:\Users\Leo\WorkBuddy\2026-06-21-10-55-16\sheen-toolbox-repo'

# ===== 灭火器计算器 =====
fire_path = f'{BASE}/fire-extinguisher-calculator/index.html'

with open(fire_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. CSS: .navbar block -> .sheen-nav (standard)
content = content.replace(
    '.navbar {\n            background: var(--black);\n            padding: 16px 32px;\n            display: flex; align-items: center; justify-content: space-between;\n            flex-wrap: wrap; gap: 12px;\n            border-bottom: 4px solid var(--brand-red);\n        }',
    '.sheen-nav {\n            background: var(--black);\n            padding: 0 32px;\n            display: flex; align-items: center; justify-content: space-between;\n            border-bottom: 4px solid var(--brand-red);\n            flex-wrap: wrap;\n            min-height: 56px;\n        }'
)

# 2. CSS: .brand -> .sheen-nav-brand (add padding)
content = content.replace(
    '.brand { display: flex; align-items: center; gap: 10px; color: #fff; text-decoration: none; }',
    '.sheen-nav-brand { display: flex; align-items: center; gap: 10px; color: #fff; text-decoration: none; padding: 14px 0; }'
)

# 3. Remove .brand-icon
content = content.replace('\n        .brand-icon { font-size: 26px; line-height: 1; }', '')

# 4. .brand-name -> .sheen-nav-brand-text
content = content.replace(
    '.brand-name { font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }',
    '.sheen-nav-brand-text { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }'
)

# 5. Remove sheen-nav-brand i rule (inline style already sets color/size)
# Add sheen-nav-brand i if missing (standard spec)
if '.sheen-nav-brand i' not in content:
    content = content.replace(
        '.sheen-nav-brand-text { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }',
        '.sheen-nav-brand i { font-size: 24px; color: var(--amber); }\n        .sheen-nav-brand-text { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }'
    )

# 6. Update media query: .navbar -> .sheen-nav (only the ones specifically for navbar)
content = content.replace('.navbar { padding: 12px 16px; }', '.sheen-nav { padding: 8px 12px; }')
content = content.replace('.navbar { padding: 10px 12px; flex-direction: column; gap: 8px; }', '.sheen-nav { padding: 8px 12px; flex-direction: column; gap: 8px; }')

# 7. Update .brand-name refs in media queries
content = content.replace('.brand-name { font-size: 17px; }', '.sheen-nav-brand-text { font-size: 17px; }')
content = content.replace('.brand-name { font-size: 16px; }', '.sheen-nav-brand-text { font-size: 16px; }')

# 8. Update print query: .navbar -> .sheen-nav
content = content.replace('.navbar, .side-nav', '.sheen-nav, .side-nav')

# 9. Remove duplicate @media sheen-nav block (stale from previous script)
content = re.sub(
    r'\s*@media \(max-width:768px\) \{\s+\.sheen-nav \{ padding:8px 12px; \}\s+\.sheen-nav-tool \{ padding:6px 10px; font-size:11px; \}\s+\}',
    '',
    content
)

# 10. HTML: <header class="navbar"> -> <header class="sheen-nav">
content = content.replace('<header class="navbar">', '<header class="sheen-nav">')

# 11. HTML: <a href="/sheen-toolbox/" class="brand"> -> <a href="/sheen-toolbox/" class="sheen-nav-brand">
content = content.replace(
    '<a href="/sheen-toolbox/" class="brand">',
    '<a href="/sheen-toolbox/" class="sheen-nav-brand">'
)

# 12. HTML: <span class="brand-name"> -> <span class="sheen-nav-brand-text">
content = content.replace(
    '<span class="brand-name">SHEEN Toolbox</span>',
    '<span class="sheen-nav-brand-text">SHEEN Toolbox</span>'
)

# 13. Standardize icon style format
content = content.replace(
    '<i class="fa-solid fa-shield-halved" style="font-size:24px;color:var(--amber);"></i>',
    '<i class="fa-solid fa-shield-halved" style="color:var(--amber);font-size:24px"></i>'
)

with open(fire_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("FIXED fire-extinguisher-calculator")

# ===== 安产费用计算器 =====
safety_path = f'{BASE}/safety-production-cost-calculator/index.html'

with open(safety_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Find and replace .header CSS with .sheen-nav
# The .header class might be used in non-nav contexts too. Let me be surgical.
# Let's find the nav-specific .header definition
content = content.replace(
    '.header {\n            background: var(--black);\n            padding: 12px 32px;\n            display: flex; align-items: center; justify-content: space-between;\n            flex-wrap: wrap; gap: 12px;\n            border-bottom: 4px solid var(--brand-red);\n        }',
    '.sheen-nav {\n            background: var(--black);\n            padding: 0 32px;\n            display: flex; align-items: center; justify-content: space-between;\n            border-bottom: 4px solid var(--brand-red);\n            flex-wrap: wrap;\n            min-height: 56px;\n        }'
)

# If the above didn't match, try alternative format
if '.sheen-nav' not in content or content.count('.sheen-nav') < 1:
    # Try different padding value
    content = re.sub(
        r'\.header\s*\{[^}]*background:\s*var\(--black\)[^}]*border-bottom:\s*4px solid var\(--brand-red\)[^}]*\}',
        '.sheen-nav { background: var(--black); padding: 0 32px; display: flex; align-items: center; justify-content: space-between; border-bottom: 4px solid var(--brand-red); flex-wrap: wrap; min-height: 56px; }',
        content
    )

# 2. Replace .brand -> .sheen-nav-brand (this page uses .brand too)
content = content.replace(
    '.brand { display: flex; align-items: center; gap: 10px; color: #fff; text-decoration: none; }',
    '.sheen-nav-brand { display: flex; align-items: center; gap: 10px; color: #fff; text-decoration: none; padding: 14px 0; }'
)

# 3. Replace .brand-text (with nested small) -> .sheen-nav-brand-text
# This page has: .brand-text { display:flex; flex-direction:column; } and .brand-text small { ... }
brand_text_block = '.brand-text { display: flex; flex-direction: column; }'
if brand_text_block in content:
    content = content.replace(brand_text_block, '.sheen-nav-brand-text { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }')
    # Remove .brand-text small rule
    content = re.sub(r'\n\s+\.brand-text small \{ font-size: 11px; font-weight: 400; opacity: 0\.7; \}', '', content)

# Add sheen-nav-brand i rule
if '.sheen-nav-brand i' not in content:
    content = content.replace(
        '.sheen-nav-brand-text { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }',
        '.sheen-nav-brand i { font-size: 24px; color: var(--amber); }\n            .sheen-nav-brand-text { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }'
    )

# 4. Update media query references
content = content.replace('            .header { padding: 8px 16px; }', '            .sheen-nav { padding: 8px 12px; }')
content = content.replace('.header, .industry-nav', '.sheen-nav, .industry-nav')
content = content.replace('.header, .sheen-nav-tools', '.sheen-nav, .sheen-nav-tools')
content = content.replace('.brand { font-size: 13px; }', '.sheen-nav-brand { font-size: 13px; }')
content = content.replace('.brand-text small { display: none; }', '')

# 5. HTML: <header class="header"> -> <header class="sheen-nav">
content = content.replace('<header class="header">', '<header class="sheen-nav">')

# 6. HTML: <a href="/sheen-toolbox/" class="brand"> -> <a href="/sheen-toolbox/" class="sheen-nav-brand">
content = content.replace(
    '<a href="/sheen-toolbox/" class="brand">',
    '<a href="/sheen-toolbox/" class="sheen-nav-brand">'
)

# 7. HTML: Replace <div class="brand-text"> with <span class="sheen-nav-brand-text">
# This is a multi-line replacement
old_brand_html = '''                <div class="brand-text">
                    SHEEN Toolbox
                    <small>安全生产费用计算器 · 财企〔2022〕136号</small>
                </div>'''
new_brand_html = '''                <span class="sheen-nav-brand-text">SHEEN Toolbox</span>'''
content = content.replace(old_brand_html, new_brand_html)

# 8. Fix icon style
content = content.replace(
    '<i class="fa-solid fa-shield-halved"></i>',
    '<i class="fa-solid fa-shield-halved" style="color:var(--amber);font-size:24px"></i>'
)

with open(safety_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("FIXED safety-production-cost-calculator")
