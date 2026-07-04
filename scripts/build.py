#!/usr/bin/env python3
"""Build script: minify HTML/CSS/JS and prepare for public deploy."""
import os, re, shutil, subprocess, sys, json

SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(SRC, 'dist')
PUBLIC_BASE = '/sheen-toolbox-pages'  # Change for custom domain

# Clean dist
if os.path.exists(DIST):
    shutil.rmtree(DIST)
os.makedirs(DIST)

print('=== Copying static assets ===')

# Copy non-HTML files that should be public
COPY_EXTS = ('.json', '.jpg', '.jpeg', '.png', '.svg', '.ico', '.txt')
SKIP_DIRS = {'.git', 'dist', 'node_modules', '.github', '__pycache__', 'scripts'}

for root, dirs, files in os.walk(SRC):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
    for f in files:
        if any(f.lower().endswith(ext) for ext in COPY_EXTS):
            src_path = os.path.join(root, f)
            rel_path = os.path.relpath(src_path, SRC)
            dst_path = os.path.join(DIST, rel_path)
            os.makedirs(os.path.dirname(dst_path), exist_ok=True)
            shutil.copy2(src_path, dst_path)
            print(f'  COPY {rel_path}')

print('\n=== Minifying HTML files ===')

html_files = []
for root, dirs, files in os.walk(SRC):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
    for f in files:
        if f.endswith('.html'):
            html_files.append(os.path.join(root, f))

for src_path in sorted(html_files):
    rel_path = os.path.relpath(src_path, SRC)
    dst_path = os.path.join(DIST, rel_path)
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)

    try:
        result = subprocess.run([
            'npx', 'html-minifier-terser',
            '--collapse-whitespace',
            '--remove-comments',
            '--minify-css',
            '--minify-js',
            '--remove-attribute-quotes',
            '--remove-optional-tags',
            '--remove-redundant-attributes',
            '--remove-script-type-attributes',
            '--remove-style-link-type-attributes',
            '--sort-class-name',
            '--sort-attributes',
            src_path,
            '-o', dst_path
        ], capture_output=True, text=True, timeout=30)

        if result.returncode == 0:
            # Replace old base path with new public base path
            with open(dst_path, 'r', encoding='utf-8') as f:
                content = f.read()
            content = content.replace('/sheen-toolbox/', PUBLIC_BASE + '/')
            with open(dst_path, 'w', encoding='utf-8') as f:
                f.write(content)
            size_orig = os.path.getsize(src_path)
            size_min = os.path.getsize(dst_path)
            pct = 100 - (size_min * 100 // size_orig) if size_orig else 0
            print(f'  MIN  {rel_path}  ({size_orig//1024}KB → {size_min//1024}KB, -{pct}%)')
        else:
            print(f'  FAIL {rel_path}: {result.stderr[:100]}')
            # Fallback: copy with basic processing
            with open(src_path, 'r', encoding='utf-8') as f:
                content = f.read()
            # Basic minification
            content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
            content = re.sub(r'\n\s*\n', '\n', content)
            content = content.replace('/sheen-toolbox/', PUBLIC_BASE + '/')
            with open(dst_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'  FALLBACK {rel_path} (basic minify)')
    except Exception as e:
        print(f'  ERROR {rel_path}: {e}')
        # Simple copy with path replace
        with open(src_path, 'r', encoding='utf-8') as f:
            content = f.read()
        content = content.replace('/sheen-toolbox/', PUBLIC_BASE + '/')
        with open(dst_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  COPY {rel_path} (no minify)')

print(f'\n=== Done! {len(html_files)} HTML files processed ===')
print(f'Output: {DIST}')
