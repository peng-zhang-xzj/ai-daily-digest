# 课程插图接入规范(DayTwo 提供给 DayOne)

目标:你的 SVG 直接 drop-in,保持单文件离线、深浅主题 + 打印都正确。

## 1. 交付方式
- 在你的讲稿 `.md` 里,图要出现的位置单独一行写 `[[figure:id]]`(也支持 `[[fig:id]]`)。
- 把 SVG 文件 + `manifest.json` 放到本目录 `mmllm-course-illustrated-dayone/`。
- 我 build 时自动读 manifest、把 SVG 内联进页面;你不用碰站点文件。

## 2. manifest.json 格式
```json
[
  {"id":"l1-attn", "svg":"l1-attn.svg", "caption":"加性注意力四步:打分→softmax→加权→上下文"},
  {"id":"l1-calc", "svg":"l1-calc.svg", "caption":"三区域手算:α=(0.4,0.1,0.5) 时上下文 z=(0.9,0.6)"}
]
```
(也接受 `{"figures":[...]}`。`svg` 省略时默认用 `<id>.svg`。)

## 3. SVG 作图规范(关键:不要硬编码颜色)
用 `viewBox`(响应式,页面里宽度自适应、max 660px 居中),**所有颜色都用下面的 class**,这样深浅主题切换和打印浅底都会自动正确;**别写 `fill="#..."` 或 `style="fill:#..."`**。

可用 class:
- 盒子描边底:`figbox`(普通)、`figbox-acc`(强调,蓝描边)
- 文字:`figtx`(正文13)、`figtx-b`(粗)、`figtx-mut`(次要小字11)、`figtx-acc`(强调蓝)
- 线:`figln`(灰线);箭头画小三角 `<polygon class="figfill-mut" .../>`
- 实心填充:`figfill-acc`(蓝)、`figfill-mut`(灰);浅色块 `figfill-sky`/`figfill-grn`/`figfill-acc2`
- 矩阵/状态单元格底色:`figcell-ok`(绿淡)、`figcell-bad`(红淡,如幻觉/错误)、`figcell-warn`(琥珀淡,如漏判)
- 需要新 class(比如某个专用色)告诉我,我在模板里加,别自己写死色值。

其它:
- 文字 `text-anchor="middle"` 居中;单行别太长(窄屏靠 `.fig` 容器横向滚动,但尽量别超 660 宽)。
- 字体不用指定,继承 class 即可(含 PingFang SC)。
- 一张图讲一个点:机制图画清数据流/箭头/维度;算例图标出具体数值。图注(caption)写在 manifest 里,不要烧进 SVG。

## 4. 参考实现
已内联 3 张样例(在 staged-index.html 可直接看):`core`(像素网格 vs token)、`dataflow`(编码器→连接器→LLM)、`confusion`(POPE 混淆矩阵)。源码见 `mmllm-course-build/figures.cjs`,照它的 class 用法写即可。
