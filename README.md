# AI Daily Digest · 每日 AI 简报

一个**零依赖、可 fork 复用**的每日 AI 信息看板。三个 Tab 聚合三类信息源：

| Tab | 来源 | 内容 | 节奏 |
|-----|------|------|------|
| 📄 论文 | [Hugging Face Daily Papers](https://huggingface.co/papers) | 每日热门论文（按 upvote 排序） | 每日 |
| 📰 资讯 | TechCrunch AI · The Decoder · MIT Tech Review | 多源 AI 行业新闻（合并去重、按时间排、每源限额） | 每日 |
| 🗞 周刊 | [The Batch](https://www.deeplearning.ai/the-batch/) | DeepLearning.AI 深度周刊 | 每周 |

## ✨ 特性

- **纯静态前端**：`index.html` + 原生 JS/CSS，无框架、无构建，GitHub Pages 直接托管。
- **数据自动更新**：GitHub Actions 每天跑 `scripts/fetch.py`（仅用 Python 标准库）抓取三源写入 `data/*.json`。
- **本地状态**：已读变灰、未读红点、收藏★、关键词过滤、深/浅色主题——全部存在浏览器 `localStorage`，无需后端。
- **优雅降级**：任一来源抓取失败只写空列表 + 错误标记，不影响其他 Tab。

## 🚀 一分钟复用（给别人）

1. **Fork** 本仓库。
2. Settings → **Pages** → Source 选 `Deploy from a branch`，分支 `main` / 根目录。
3. Settings → Actions → 确认 workflow 有 **写权限**（Read and write permissions）。
4. Actions 页手动点一次 **Run workflow**（`Update digest`）生成首批数据。
5. 打开 `https://<你的用户名>.github.io/<仓库名>/` 即可。

之后每天 07:00 UTC 自动刷新。

## 🖥 本地预览

```bash
python3 scripts/fetch.py          # 抓一次数据到 data/
python3 -m http.server 8080       # 然后浏览器打开 http://localhost:8080
```

> 直接双击 `index.html` 打不开数据——浏览器会拦截本地 `fetch()`，必须用 http server。

## 🔧 定制

- **改抓取量 / 时间窗**：`scripts/fetch.py` 顶部各 `fetch_*` 的 `limit` / `days_back`。
- **换/加来源**：在 `fetch.py` 里加一个 `fetch_xxx()` 写出 `data/xxx.json`，再在 `index.html` 加个 Tab、`assets/app.js` 的 `TABS` 和 `RENDER` 里加对应渲染即可。
- **改刷新时间**：`.github/workflows/update.yml` 的 cron。

## 📁 结构

```
ai-daily-digest/
├── index.html            # 三 Tab 界面
├── assets/
│   ├── style.css         # 主题 / 卡片样式
│   └── app.js            # 渲染 + 交互 + localStorage
├── data/*.json           # 抓取产物（Actions 自动更新）
├── scripts/fetch.py      # 三源抓取（stdlib only）
└── .github/workflows/update.yml
```

## ⚠️ 已知点

- **The Batch 无官方 RSS**（站点已迁 Next.js），这里改为抓取 issue 列表页 + 每期 `og:` 元数据。若对方改版需调整 `fetch_batch()`。
- 资讯源若某个临时抽风，其他源仍会填充；HF/The Batch 当天为空则次日自动恢复。
- 换/加资讯源：改 `scripts/fetch.py` 里的 `NEWS_FEEDS` 列表即可。
