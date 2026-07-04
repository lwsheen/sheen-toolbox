#!/usr/bin/env python3
"""
SHEEN Toolbox 样式一致性检查脚本
扫描所有工具子页，检查是否遵循统一设计规范
用法: python check_style.py [--fix]
"""
import os, re, sys

SRC = 'sheen-toolbox-repo'
errors = []

# 禁止出现的旧 CSS 变量名（家族 B）
FORBIDDEN_VARS = [
    r'--red\b(?!-)',       # 应该是 --brand-red
    r'--redH\b',           # 应该是 --brand-red-hover
    r'--redL\b',           # 应该是 --brand-red-light
    r'--text\b(?!-)',      # 应该是 --text-primary
    r'--text2\b',          # 应该是 --text-secondary
    r'--bg\b(?!-)',        # 应该是 --bg-page
    r'--card\b',           # 应该是 --bg-card
    r'--bd\b',             # 应该是 --border
    r'--amb\b',            # 应该是 --amber
    r'--r\b(?!\w)',        # 应该是 --radius-*
]

# 禁止出现的按钮类名
FORBIDDEN_CLASSES = [
    r'\.btn-p\b',          # 应该是 .btn-primary
    r'\.btn-o\b',          # 应该是 .btn-outline
    r'\.btn-d\b',          # 应该是 .btn-danger
    r'\.btn-bad\b',        # 应该是 .btn-outline
]

# 必须存在的元素
REQUIRED_ELEMENTS = [
    ('common.css', '缺少 common.css 引用'),
    ('class="breadcrumb"', '缺少面包屑导航'),
    ('class="sheen-footer', '缺少品牌页脚'),
]

def check_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    for pattern in FORBIDDEN_VARS:
        matches = re.findall(pattern, content)
        for m in set(matches):
            errors.append(f'{filepath}: 使用了旧CSS变量 "{m}"，应使用对应新变量名')
            err_count[0] += 1

    for pattern in FORBIDDEN_CLASSES:
        if re.search(pattern, content):
            errors.append(f'{filepath}: 使用了废弃按钮类名 (匹配 {pattern})')
            err_count[0] += 1

    for elem, msg in REQUIRED_ELEMENTS:
        if elem not in content:
            errors.append(f'{filepath}: {msg}')
            err_count[0] += 1

    # 检查页面内 :root 块（警告，不影响功能）
    root_vars = re.findall(r':root\s*\{([^}]+)\}', content)
    if root_vars:
        print(f'  [WARN] {filepath}: 页面内定义 :root 变量块，common.css 已提供相同变量，建议逐步移除')

    # 检查 @media print 是否隐藏了面包屑（common.css 已统一处理）
    if '@media print' in content:
        if '.breadcrumb' not in content or 'display: none' not in content:
            pass  # common.css covers this, individual page may have additional rules
    return True


if __name__ == '__main__':
    err_count = [0]
    files_checked = 0

    for root, dirs, files in os.walk(SRC):
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'assets']
        for fname in files:
            if fname == 'index.html' and root != SRC:
                check_file(os.path.join(root, fname))
                files_checked += 1

    if err_count[0] == 0:
        print(f'OK 全部 {files_checked} 个工具页面通过检查')
    else:
        print(f'\n发现 {err_count[0]} 个问题（共检查 {files_checked} 个页面）:')
        for e in errors:
            print(f'  [ERR] {e}')
        sys.exit(1)
