# Cloudflare Pages 部署指南（免备案、免费）

> 适用场景：没有域名、没有 ICP 备案，想让站点多一个更稳的可达入口。
> 前提：当前全站零外部 CDN 依赖（v32 已确认），Cloudflare Pages 只会让加载更稳。

## 为什么需要 build_cf.sh
站点所有资源使用绝对路径 `/sheen-toolbox/...`（GitHub Pages 把仓库名当子路径）。
Cloudflare Pages 默认根域是 `sheen-toolbox.pages.dev/`（**无子路径**），直接部署会导致
`/sheen-toolbox/...` 全部 404。
`scripts/build_cf.sh` 把整站包进 `dist/sheen-toolbox/` 子目录，使
`https://sheen-toolbox.pages.dev/sheen-toolbox/` 完美命中，**零代码改动**，Service Worker / manifest 路径也自动匹配。

## 方式一：Cloudflare Dashboard 连 GitHub（推荐，最省事）
1. 登录 https://dash.cloudflare.com → 左侧 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 授权并选择仓库 `lwsheen/sheen-toolbox`（用公仓压缩版，或私仓干净源码均可）。
3. 构建设置：
   - **Framework preset**：`None`
   - **Build command**：`bash scripts/build_cf.sh`
   - **Build output directory**：`dist`
4. 点 **Save and Deploy**。约 1 分钟后得到地址 `https://sheen-toolbox.pages.dev/`。
5. 实测访问：`https://sheen-toolbox.pages.dev/sheen-toolbox/`（注意带 `/sheen-toolbox/` 子路径）。

## 方式二：本地 CLI 直接推（需 Cloudflare API Token）
```bash
# 1. 本地构建（生成 dist/sheen-toolbox/）
bash scripts/build_cf.sh

# 2. 安装 wrangler（托管 Node 环境下）
npm i -g wrangler

# 3. 部署（CLOUDFLARE_API_TOKEN 需有 Pages 编辑权限）
CLOUDFLARE_API_TOKEN=xxxx npx wrangler pages deploy dist --project-name sheen-toolbox
```
> 把 API Token 发我，我可以直接在本地帮你推，无需你装环境。

## 大陆访问说明（务必看清）
- Cloudflare **免费版没有大陆节点**，走境外 anycast。对大陆用户多数时段比 GitHub Pages 直连更稳，
  但**不是"大陆真加速"**，偶发仍慢。
- `pages.dev` 域名在大陆个别网络/时段可能被干扰（概率低于 jsdelivr）。
- **真正的大陆加速**仍必须：买域名（lwsheen.cn）→ 实名 → ICP 备案 → 用 Cloudflare 中国/阿里云/七牛大陆 CDN。

## 自定义域（备案后）
备案完成后，可在 Cloudflare Pages 项目 → **Custom domains** 绑定 `toolbox.lwsheen.cn`，
再配合 Cloudflare 中国网络或国内 CDN，才是完整的大陆加速方案。

## 与现有 GitHub Pages 的关系
- 两者**并存**：GitHub Pages（`lwsheen.github.io/sheen-toolbox/`）继续作为主站；
  Cloudflare Pages 作为额外入口/容灾。
- 后续发布仍走 `python deploy.py`（推 GitHub 双仓）；Cloudflare Pages 由 Git 集成自动拉取最新提交构建。
- 注意：GitHub Pages 与 Cloudflare Pages 是两个独立构建，改代码后两边都会更新（CF 走 Git 触发）。
