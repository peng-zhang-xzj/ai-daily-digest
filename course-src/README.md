# 课程站源文件（《多模态大模型的前世今生》）

`../course/index.html` 是**构建产物**(单文件自包含 HTML)。本目录是它的源,改内容/插图请改这里再重建,不要直接手改 index.html。

## 目录
- `mmllm-course-build/` — 构建管线
  - `render.cjs` — markdown → 站点 HTML 渲染器(支持 `## 小节`、代码块、表格、`[[widget:x]]`、`[[figure:id]]`、`## 练习`→可折叠)
  - `build.cjs` — 读 `lectures.config.json` + `template.html` + 各讲 md + 图,重建 `LECTURES` 数组,注入 `figure-theme.css`,输出 `staged-index.html`
  - `figures.cjs` — 我方(DayTwo)的内联 SVG 图注册表
  - `template.html` — 页面骨架(CSS/JS,`__LECTURES__` 占位)
  - `lectures.config.json` — 每讲元信息(id/grp/kick/title/lead)
  - `lectures/` — DayTwo 负责的讲:l0 / l5 / l9 / l10 / lab 的 md
- `mmllm-course-expanded-dayone/` — DayOne 负责的讲:l1–l4 / l6–l8 的 md
- `mmllm-course-illustrated-dayone/` — DayOne 的插图:`svg/` + `manifest.json` + `figure-theme.css`(d1-* class 映射到页面 CSS 变量)

## 重建
```bash
cd ai-daily-digest/course-src
node mmllm-course-build/build.cjs            # 生成 mmllm-course-build/staged-index.html
cp mmllm-course-build/staged-index.html ../course/index.html
# 同步离线副本:
cp ../course/index.html ../../mmllm-course-site/index.html
```
`ROOT` 默认取 `build.cjs` 的上两级(即本目录);也可 `COURSE_ROOT=/path node .../build.cjs` 覆盖。

## 加一张图
- DayTwo 侧:在 `figures.cjs` 加 `FIGS["id"]={cap,svg}`,讲稿 md 里写 `[[fig:id]]`。
- DayOne 侧:SVG 放 `mmllm-course-illustrated-dayone/svg/`,在 `manifest.json` 加 `{id,svg,caption}`,讲稿 md 里写 `[[figure:id]]`。
- SVG 颜色只用 class(figbox/figtx/figln/figfill-*/figcell-*/d1-f-*/d1-s-*),不要硬编码色值——保证深浅主题 + 打印都正确。

## 验证(发布前)
- `node --check` 抽出的 `<script>`;jsdom 烟雾测试 12 讲 + 组件无异常。
- 线上/离线/仓库三份 index.html 的 SHA 一致。
- GPU 推理、POPE 全集评测:当前明确标「未验证」,需在有卡机器跑通后才改。
