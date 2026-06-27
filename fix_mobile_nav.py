#!/usr/bin/env python3
"""统一所有页面手机端导航栏：左对齐 + 去除水平滚动"""

import re
import os

BASE = r'C:\Users\Leo\WorkBuddy\2026-06-21-10-55-16\sheen-toolbox-repo'

TOOL_DIRS = [
    'pssr-checklist',
    'fire-extinguisher-calculator',
    'safety-production-cost-calculator',
    'jsa-lec',
    'industry-classification',
    'dangerous-goods-query',
    'five-why-analysis',
    'hazardous-waste-query',
    'hazardous-chemicals-query',
]

for slug in TOOL_DIRS:
    filepath = os.path.join(BASE, slug, 'index.html')
    if not os.path.exists(filepath):
        print(f'  SKIP: {slug}')
        continue

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Fix 1: Remove justify-content:center from .sheen-nav-tools in ALL contexts
    # Pattern: .sheen-nav-tools{justify-content:center...} or .sheen-nav-tools { justify-content: center... }
    content = re.sub(
        r'(\.sheen-nav-tools\s*\{[^}]*?)justify-content\s*:\s*center\s*;?\s*',
        r'\1',
        content
    )

    # Fix 2: Remove overflow-x:auto; flex-wrap:nowrap; white-space:nowrap from nav-tools (5Why page)
    content = re.sub(
        r'(\.sheen-nav-tools\s*\{[^}]*?)overflow-x\s*:\s*auto\s*;?\s*',
        r'\1',
        content
    )
    content = re.sub(
        r'(\.sheen-nav-tools\s*\{[^}]*?)flex-wrap\s*:\s*nowrap\s*;?\s*',
        r'\1',
        content
    )
    content = re.sub(
        r'(\.sheen-nav-tools\s*\{[^}]*?)white-space\s*:\s*nowrap\s*;?\s*',
        r'\1',
        content
    )

    # Fix 3: Remove padding-bottom from nav-tools on mobile (pssr, jsa-lec)
    content = re.sub(
        r'(\.sheen-nav-tools\s*\{[^}]*?)padding-bottom\s*:\s*\d+px\s*;?\s*',
        r'\1',
        content
    )

    # Fix 4: Clean up empty { } blocks that might result
    content = re.sub(r'\.sheen-nav-tools\s*\{\s*\}', '', content)
    content = content.replace('.sheen-nav-tools{}', '')

    # Fix 5: Clean up trailing semicolons/semicolons before closing brace
    content = re.sub(r'\.sheen-nav-tools\s*\{\s*;\s*\}', '', content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  FIXED: {slug}')
    else:
        print(f'  NOCHANGE: {slug}')

print('\nDone!')
