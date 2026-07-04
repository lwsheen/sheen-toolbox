#!/usr/bin/env python3
"""
统一所有工具页面导航栏为纯文字格式（去除所有 Font Awesome 图标）
修复破损的 HTML 标签
"""

import re
import os

BASE = r'C:\Users\Leo\WorkBuddy\2026-06-21-10-55-16\sheen-toolbox-repo'

# 统一导航链接（纯文字，无图标）
# 格式：(目录名, 显示文字)
NAV_LINKS = [
    ('pssr-checklist', 'PSSR检查表'),
    ('fire-extinguisher-calculator', '灭火器计算器'),
    ('safety-production-cost-calculator', '安产费用计算器'),
    ('jsa-lec', 'JSA+LEC评价'),
    ('industry-classification', '行业分类查询'),
    ('dangerous-goods-query', '危险货物查询'),
    ('five-why-analysis', '5Why根因分析'),
    ('hazardous-waste-query', '危险废物查询'),
    ('hazardous-chemicals-query', '危险化学品查询'),
]

TOOL_DIRS = [d for d, _ in NAV_LINKS]


def build_nav_html(current_dir):
    """生成统一纯文字导航 HTML"""
    lines = []
    for slug, name in NAV_LINKS:
        active = ' active' if slug == current_dir else ''
        href = f'/sheen-toolbox/{slug}/'
        lines.append(f'      <a href="{href}" class="sheen-nav-tool{active}">{name}</a>')
    return '\n'.join(lines)


def fix_page(filepath, slug):
    """修复单个页面"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. 替换整个导航链接块
    # 匹配从第一个 <nav 或 <div class="sheen-nav-tools"> 开始到对应闭合标签
    # 使用更精确的方式：找到包含 sheen-nav-tools 的块
    pattern = r'(<(?:nav|div)\s+class="sheen-nav-tools"[^>]*>)(.*?)(</(?:nav|div)>)'
    
    def replace_nav(match):
        open_tag = match.group(1)
        close_tag = match.group(3)
        new_links = build_nav_html(slug)
        return f'{open_tag}\n{new_links}\n    {close_tag}'

    content = re.sub(pattern, replace_nav, content, flags=re.DOTALL)

    # 2. 修复任何残留的破损 <a> 标签（缺少 < 的）
    content = re.sub(r'(?<!\<)a href="([^"]*)" class="sheen-nav-tool', r'<a href="\1" class="sheen-nav-tool', content)

    # 3. 移除 .sheen-nav-tool i 的 CSS 规则（因为不再有图标）
    content = re.sub(r'\.sheen-nav-tool\s+i\s*\{[^}]*\}\s*', '', content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False


def main():
    fixed = []
    for slug in TOOL_DIRS:
        filepath = os.path.join(BASE, slug, 'index.html')
        if not os.path.exists(filepath):
            print(f'  SKIP: {slug} (file not found)')
            continue
        if fix_page(filepath, slug):
            fixed.append(slug)
            print(f'  FIXED: {slug}')
        else:
            print(f'  NOCHANGE: {slug}')

    print(f'\n共修复 {len(fixed)} 个页面: {fixed}')
    return fixed


if __name__ == '__main__':
    main()
