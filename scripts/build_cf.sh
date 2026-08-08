#!/usr/bin/env bash
# Cloudflare Pages 构建脚本
# 站点所有资源用绝对路径 /sheen-toolbox/... （GitHub Pages 把仓库名当子路径）。
# Cloudflare Pages 根域是 sheen-toolbox.pages.dev/ （无子路径），直接部署会 404。
# 解法：把整站包进 dist/sheen-toolbox/ 子目录，使 pages.dev/sheen-toolbox/ 完美命中，零代码改动。
set -e
cd "$(dirname "$0")/.."            # 切到仓库根（本脚本位于 scripts/）
rm -rf dist
mkdir -p dist/sheen-toolbox

for item in "$PWD"/*; do
  name=$(basename "$item")
  case "$name" in
    dist|build|.git) continue ;;   # 排除构建产物、git 元数据
  esac
  cp -r "$item" "dist/sheen-toolbox/"
done

count=$(find dist/sheen-toolbox -type f | wc -l | tr -d ' ')
echo "✓ Cloudflare Pages 构建输出已生成: dist/sheen-toolbox/  (${count} 个文件)"
echo "  线上地址: https://sheen-toolbox.pages.dev/sheen-toolbox/"
