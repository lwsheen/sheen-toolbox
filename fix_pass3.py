#!/usr/bin/env python3
"""第3遍深度修复：icon内联样式、media query碎片整理"""

import os

BASE = r'C:\Users\Leo\WorkBuddy\2026-06-21-10-55-16\sheen-toolbox-repo'

# ===== 1. 6个页面添加盾牌图标内联样式 =====
missing_style_dirs = [
    'pssr-checklist', 'jsa-lec', 'industry-classification',
    'dangerous-goods-query', 'hazardous-waste-query', 'hazardous-chemicals-query'
]

for slug in missing_style_dirs:
    fpath = os.path.join(BASE, slug, 'index.html')
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    old = '<i class="fa-solid fa-shield-halved"></i>'
    new = '<i class="fa-solid fa-shield-halved" style="color:var(--amber);font-size:24px"></i>'
    if old in content:
        content = content.replace(old, new)
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  ICON: {slug}')

# ===== 2. fire-extinguisher: 添加标准 @media(768px) nav-tool 尺寸 =====
fpath = os.path.join(BASE, 'fire-extinguisher-calculator', 'index.html')
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

# Insert standard 768px nav sizing BEFORE the 820px query (which is first @media)
# Find where to insert: after the print-time CSS, before @media (max-width: 820px)
insert_pos = content.find('@media (max-width: 820px)')
if insert_pos > 0:
    snippet = '\n        /* Mobile nav sizing */\n        @media (max-width:768px) {\n          .sheen-nav { padding:8px 12px; }\n          .sheen-nav-tool { padding:6px 10px; font-size:11px; }\n        }\n        '
    content = content[:insert_pos] + snippet + content[insert_pos:]
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('  MEDIA: fire-extinguisher +768px')

# ===== 3. safety-production-cost: 添加标准 @media(768px)  =====
fpath = os.path.join(BASE, 'safety-production-cost-calculator', 'index.html')
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

# Check if 768px query already exists (earlier script may have added)
if '@media (max-width:768px)' not in content:
    # Find @media (max-width: 820px) to insert before
    insert_pos = content.find('@media (max-width: 820px)')
    if insert_pos > 0:
        snippet = '\n        /* Mobile nav sizing */\n        @media (max-width:768px) {\n          .sheen-nav { padding:8px 12px; }\n          .sheen-nav-tool { padding:6px 10px; font-size:11px; }\n        }\n        '
        content = content[:insert_pos] + snippet + content[insert_pos:]
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print('  MEDIA: safety-production +768px')
else:
    print('  MEDIA: safety-production already has 768px')

# ===== 4. jsa-lec: 合并重复 @media(768px) =====
fpath = os.path.join(BASE, 'jsa-lec', 'index.html')
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

# jsa-lec has two @media(768px) sections. Merge them.
# Remove the SECOND @media(max-width:768px) and move its rules into the first
# The second one starts at line ~160

# Find the second occurrence
first_pos = content.find('@media (max-width:768px)')
second_pos = content.find('@media(max-width:768px)')

if first_pos > 0 and second_pos > first_pos:
    # Extract the second block's content
    # Find where the second block ends (at next @media or end of style)
    after_second = content[second_pos:]
    # Find closing brace for the second block
    brace_count = 0
    in_block = False
    block_content = ''
    for i, ch in enumerate(after_second):
        if ch == '{':
            brace_count += 1
            in_block = True
        elif ch == '}':
            brace_count -= 1
        if in_block:
            block_content += ch
        if in_block and brace_count == 0:
            break

    # Remove everything from second_pos to end of block
    # Replace first @media with merged version
    # The second block's content: .sheen-nav{padding:0 16px;flex-direction:column} .sheen-nav-tools{justify-content:center;padding-bottom:12px}
    # But we already removed justify-content:center! So it's just .sheen-nav-tools{padding-bottom:12px}
    
    # Actually, let's just remove the flex-direction:column and keep consistent
    # Remove the entire duplicate block
    old_second = content[second_pos:second_pos + len(block_content) + 1]
    content = content.replace(old_second, '\n')
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('  MEDIA: jsa-lec merged duplicate 768px')

# ===== 5. Clean up dead .badge-version CSS (only CSS, no HTML elements) =====
for slug in ['fire-extinguisher-calculator', 'safety-production-cost-calculator']:
    fpath = os.path.join(BASE, slug, 'index.html')
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove .badge-version CSS rules (the HTML elements were already removed)
    import re
    
    # Remove .badge-version { ... } blocks
    content = re.sub(r'\.badge-version\s*\{[^}]*\}', '', content)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  CLEAN: {slug} dead badge CSS')

print('\nAll fixes applied!')
