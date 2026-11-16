# Lab 亲手跑一遍:从空目录到可信的评测数字

建议 60–90 分钟(A 级 CPU 接口 + C 级评分必做,约 40 分钟;B 级 GPU 推理选做)。前置:会用命令行、装过 Python 包。首次下载模型权重的时间不计入。

学完应能:从一个空目录搭好环境并跑通 processor 实验;亲手复现「576 / 144 个视觉 token」;在**不需要 GPU** 的情况下跑一次 POPE 式评分,算出 TP/FP/FN/TN 与 P/R/F1/yes-ratio;并说清两模型同为 576 token 效果却可能不同的原因。

## 1. 先建立正确预期

看十遍不如跑一遍。前面讲的「LLaVA-1.5:336²→576」「Qwen2.5-VL:336²→144、672²→576」这些数字,只有你自己打印出张量形状才会真的记住。

> **关于「纯前端跑真实推理」**:本站是无依赖静态页,不内置推理运行时,所以互动组件用的是可复现的原理级可视化 + 预设/实测数值,不是现场大模型输出。原则上 WebGPU/WASM 可跑小模型;现场大模型 demo 建议另配 GPU 服务,并保留可复现的离线记录。真要跑真实模型,就按下面在有环境的机器上做。

## 2. 四级实验:逐级加码

| 层次 | 做什么 | 通过标准 |
|---|---|---|
| **A · CPU 接口实验**(无需 GPU) | 用真实 processor 处理同一张图,打印输入张量与视觉 token 数 | 记录版本、原尺寸、grid、pixel shape、视觉 token 数;与预期一致 |
| **B · GPU 推理** | 同图同问题、greedy 解码,分别跑 LLaVA 与 Qwen | 保存原始答案、checkpoint/revision、环境、采样设置、时延与显存;不预设谁必胜 |
| **C · 评测**(本讲给无需 GPU 的最小版) | 用预测记录 + 标签跑 POPE 式评分 | 输出 TP/FP/FN/TN + P/R/F1/acc/yes-ratio;小样本不声称全集成绩 |
| **D · 人工误差分析** | 翻 30 条有 id 的输出 | 区分视觉漏识别 / 语言先验 / 答案提取错误 / 标签争议;给 3 条有图有证据的失败案例 |

## 3. A 级手算 + 实测:视觉 token 数怎么来

先手算(patch 边长 14),再用脚本核对:

```text
LLaVA-1.5:任何输入都先缩放到 336×336
  336 / 14 = 24  →  24×24 = 576 patch  →  576 视觉 token(无合并)

Qwen2.5-VL:原生动态分辨率 + 2×2 合并
  336×336 →  24×24 = 576  → 合并(÷4) → 144 视觉 token
  672×672 →  48×48 = 2304 → 合并(÷4) → 576 视觉 token
```

两模型都可能出现 576,但来路完全不同:LLaVA 的 576 来自被压到 336 的固定输入;Qwen 的 576 来自 672 原生分辨率再合并。**序列长度相等,承载的信息不相等。** DayOne 用真实 processor 的 CPU 实测(torch 2.11.0 / transformers 5.12.1)与手算一致:

| 模型 | 输入 336² | 输入 672² |
|---|---|---|
| LLaVA-1.5-7b | 缩放到 336² → 576 | 仍缩放到 336² → 576 |
| Qwen2.5-VL-3B | 24×24=576 → 合并 → 144 | 48×48=2304 → 合并 → 576 |

[[fig:labtokens]]

## 4. 从空目录搭环境(完整步骤)

下面每一步都能照抄。先下载脚本(用页面下方按钮,或从仓库 `course/` 取):

```bash
# ① 新建工作目录
mkdir mmllm-lab && cd mmllm-lab

# ② 建独立虚拟环境(避免污染系统 Python)
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# ③ 装依赖(A 级只需 processor 相关;版本见 requirements-observed.txt)
pip install --upgrade pip
pip install torch transformers pillow accelerate

# ④ 把下载来的 lab_shapes.py / score_pope.py / *.jsonl 放进本目录

# ⑤ A 级:只下载 processor 小文件,CPU 即可
python lab_shapes.py --model llava --sizes 336 672 --out llava-shapes.json
python lab_shapes.py --model qwen  --sizes 336 672 --out qwen-shapes.json

# ⑥ 读结果:打开 JSON,核对 expected_llm_visual_tokens 是否 = 576 / 144
python -c "import json;print(json.load(open('qwen-shapes.json'))['cases'][0]['expected_llm_visual_tokens'])"
```

**常见报错速查**:
- `ModuleNotFoundError: No module named 'torch'` → 没装依赖或没激活 venv(重跑 ②③)。
- 下载模型文件卡住/超时 → 换网络或设镜像(如 `HF_ENDPOINT` 环境变量指向国内镜像)。
- `KeyError` 读 JSON → 字段名看实际文件,不同 transformers 版本字段可能变。
- Windows 下 `source` 不可用 → 用 `venv\Scripts\activate`。

### 下载实验文件(在线/离线都可用)

[[widget:labdl]]

## 5. C 级:无需 GPU 的最小评分实验

C 级的坑是「上来就指向一个没跑通的工具」。这里给一个**完全不需要 GPU、不需要模型**的最小版:用一份现成的「预测记录 + 标签」,亲手把 L9 的指标算出来。下载 `score_pope.py`、`pope_mini_gold.jsonl`、`pope_mini_pred.jsonl` 后:

```bash
python score_pope.py --gold pope_mini_gold.jsonl --pred pope_mini_pred.jsonl
```

输出(这份教学样例的真实运行结果):

```text
样本数 n = 10
混淆矩阵: TP=5  FP=2  FN=0  TN=3
Precision = 0.714
Recall    = 1.000
F1        = 0.833
Accuracy  = 0.800
yes-ratio = 0.700   (对照真实正例率 = 0.500)
```

**怎么读这份结果**(呼应 L9):
- `FP=2` 就是**幻觉**——图里没有却答「有」(样例里 q4、q8)。
- `yes-ratio=0.70` 要对照**真实正例率 0.50** 看:模型偏爱答「有」,所以 recall 满、但 precision 掉到 0.714。

**这个脚本故意用「严格协议」**:预测只接受受控格式(`yes`/`no`/`是`/`否`);遇到不合规的答案、缺失/多余/重复的 id、非法标签,它会**直接报错退出,绝不输出一个貌似有效的分数**。这是故意的——评分脚本最怕「悄悄把异常当成某一类、给出看起来正常其实错的分」。

> **重要边界**:这个 yes/no 解析只是**教学用的受控格式解析器**,不是通用语义裁判。真实模型会输出自由文本(「是的,图里有只猫」「不太确定」),把它映射成 yes/no 需要**具体评测协议自己的、经过验证的提取规则**——真跑 POPE 要用其官方/固定协议,别拿这个简单规则当通用裁判(否则像「notebook」含 no、「不确定」含不 这种子串陷阱就会判错,这正是我们不用子串匹配的原因)。

**动手改一改**:把 `pope_mini_pred.jsonl` 里某条 `yes` 改成 `no`,重跑,看 FP/FN 和各指标怎么变——这比记公式管用。等你有 GPU,把真实模型在 POPE 小样本上的输出**按该评测协议**转成受控格式的 `pred.jsonl`,同一个脚本就能评分。

真正上规模时才用 VLMEvalKit:但记住**先别抄随版本漂移的命令**,它的 `--model` 配置名与 `--data` 注册名要在固定 commit 上实际查询并跑通后再写进笔记。

## 6. 环境与显存(B 级前必读)

- 用独立 venv/conda + 固定依赖版本(本课实测版本见 `requirements-observed.txt`)。
- 显存**不只由参数量决定**:还要算 dtype、输入/输出长度、量化配置。先估算,再按目标机实测。
- 本包 **GPU 路径未验证**,需你在目标授课机跑通后才标「验证通过」;没有 GPU 时,A 级 processor + C 级评分已是有效的前两步。

## 7. 精确书单(按顺序读,均为可点击一手链接)

**必读**:① LLaVA([初版 2304.08485](https://arxiv.org/abs/2304.08485) + [1.5 2310.03744](https://arxiv.org/abs/2310.03744))② [Qwen2.5-VL 技术报告 2502.13923](https://arxiv.org/html/2502.13923v1)③ [CLIP 2103.00020](https://arxiv.org/abs/2103.00020)。

**补齐**:④ [BLIP-2 2301.12597](https://arxiv.org/abs/2301.12597)⑤ [Flamingo 2204.14198](https://arxiv.org/abs/2204.14198)⑥ Molmo/PixMo、SigLIP。

**Tokenizer 分叉**:⑦ Chameleon ⑧ Emu3 ⑨ [Janus](https://github.com/deepseek-ai/Janus) / [JanusFlow 2411.07975](https://arxiv.org/abs/2411.07975)。

**评测**:[POPE 2305.10355](https://arxiv.org/abs/2305.10355)、[原始 VQA 1505.00468](https://arxiv.org/abs/1505.00468);工具 [VLMEvalKit](https://github.com/open-compass/VLMEvalKit)(固定 commit)。

## 8. 核心代码仓库

- [`haotian-liu/LLaVA`](https://github.com/haotian-liu/LLaVA#train) — 官方,代码友好(含训练配置)
- [`Qwen/Qwen2.5-VL-3B-Instruct`](https://huggingface.co/Qwen/Qwen2.5-VL-3B-Instruct) — 具体型号/固定版本的模型卡(官方 repo main 已转向新系列,务必指定型号)
- [`open-compass/VLMEvalKit`](https://github.com/open-compass/VLMEvalKit) — 一站式评测(固定 commit 与实际注册名)

## 9. 自检清单(可点击勾选,进度自动保存)

[[widget:checklist]]

勾完清单代表「入门路径走通」,**不等于「掌握任何新 VLM」**——真正的手感来自多读几份报告、多跑几次对比。

## 练习

1. 一张 448×448 的图喂给 LLaVA-1.5,得到多少视觉 token? —— 答案:仍是 576。LLaVA-1.5 把任何输入缩放到 336²,恒为 24×24=576,与原始分辨率无关。
2. C 级实验里 `FP=2` 代表什么?对应 L9 的哪个概念? —— 答案:代表模型 2 次「图里没有却答有」,就是幻觉(false positive);对应 POPE 混淆矩阵里的 FP。
3. 样例 yes-ratio=0.70、真实正例率=0.50,说明模型有什么倾向? —— 答案:偏爱答「有」,导致 recall 高但 precision 降(误报多)。要对照真实正例率而非固定 0.5 来判断。
4. 为什么 C 级要先给一个无需 GPU 的评分实验? —— 答案:让学生在没有 GPU、不跑模型的情况下也能亲手算出 TP/FP/FN/TN 与 P/R/F1/yes-ratio,理解评测机制,而不是指向一个尚未跑通的重型工具。
5. 两个模型都是 576 视觉 token,为什么效果可能差很多? —— 答案:token 数不等于信息量/效果。原图分辨率、视觉编码器、合并结构、训练数据与目标都不同(LLaVA 的 576 来自 336² 固定输入,Qwen 的来自 672² 原生+合并)。
