/* Inline SVG figure registry — themeable via page CSS vars, offline, print-safe.
   Reference from markdown with [[fig:NAME]]; render.cjs inlines the SVG + caption. */
const FIGS = {};

// 核心矛盾:稠密像素网格 vs 稀疏离散 token 序列
FIGS["core"] = {
  cap: "核心矛盾:图像是稠密二维像素网格,文字是稀疏一维离散符号,天生不在一个空间",
  svg: `<svg viewBox="0 0 720 230" role="img" aria-label="像素网格与token序列的对比">
  <text x="130" y="24" class="figtx-b" text-anchor="middle">图像 · 稠密二维像素网格</text>
  ${(()=>{let r='';for(let y=0;y<8;y++)for(let x=0;x<8;x++){const c=['figfill-sky','figfill-grn','figfill-acc2'][(x*3+y*5)%3];r+=`<rect class="${c}" x="${50+x*20}" y="${40+y*20}" width="19" height="19"/>`;}return r;})()}
  <text x="130" y="206" class="figtx-mut" text-anchor="middle">336×336×3 个 0–255 整数 · 相邻冗余</text>
  <text x="360" y="120" class="figtx-mut" text-anchor="middle">≠</text>
  <path class="figln" d="M250 115 H470"/><polygon class="figfill-mut" points="470,110 482,115 470,120"/>
  <text x="596" y="24" class="figtx-b" text-anchor="middle">文字 · 稀疏一维离散符号</text>
  ${["一只","狗","在","草地","上"].map((t,i)=>`<rect class="figbox-acc" x="${500+i*44}" y="70" width="40" height="34" rx="7"/><text x="${520+i*44}" y="92" class="figtx-acc" text-anchor="middle">${t}</text>`).join("")}
  <text x="596" y="140" class="figtx-mut" text-anchor="middle">词表里的离散 id · 每个信息量高</text>
  </svg>`
};

// 全课数据流:编码器 → 连接器 → 语言模型
FIGS["dataflow"] = {
  cap: "贯穿全课的数据流:视觉编码器(问题①信息提取)→连接器(问题②对齐)→组织成序列(问题③位置)→LLM",
  svg: `<svg viewBox="0 0 760 300" role="img" aria-label="编码器到连接器到语言模型的数据流">
  <g>
    <rect class="figbox" x="20" y="40" width="80" height="40" rx="8"/><text x="60" y="65" class="figtx" text-anchor="middle">图像</text>
    <rect class="figbox-acc" x="130" y="34" width="120" height="52" rx="8"/><text x="190" y="56" class="figtx-acc" text-anchor="middle">视觉编码器</text><text x="190" y="72" class="figtx-mut" text-anchor="middle">ViT</text>
    <rect class="figbox-acc" x="290" y="34" width="110" height="52" rx="8"/><text x="345" y="56" class="figtx-acc" text-anchor="middle">连接器</text><text x="345" y="72" class="figtx-mut" text-anchor="middle">投影/Resampler</text>
    <path class="figln" d="M100 60 H128"/><polygon class="figfill-mut" points="128,55 140,60 128,65"/>
    <path class="figln" d="M250 60 H288"/><polygon class="figfill-mut" points="288,55 300,60 288,65"/>
    <text x="190" y="24" class="figtx-mut" text-anchor="middle">①信息提取</text>
    <text x="345" y="24" class="figtx-mut" text-anchor="middle">②对齐</text>
  </g>
  <g>
    <rect class="figbox" x="20" y="150" width="80" height="40" rx="8"/><text x="60" y="175" class="figtx" text-anchor="middle">文本</text>
    <rect class="figbox" x="130" y="150" width="120" height="40" rx="8"/><text x="190" y="175" class="figtx" text-anchor="middle">分词器</text>
    <path class="figln" d="M100 170 H128"/><polygon class="figfill-mut" points="128,165 140,170 128,175"/>
  </g>
  <rect class="figfill-acc" x="430" y="40" width="26" height="46" rx="4" opacity="0.85"/>
  <rect class="figfill-acc" x="430" y="150" width="26" height="40" rx="4" opacity="0.4"/>
  <text x="500" y="70" class="figtx-mut" text-anchor="middle">视觉 tokens</text>
  <text x="500" y="175" class="figtx-mut" text-anchor="middle">文本 tokens</text>
  <path class="figln" d="M400 60 H430"/><path class="figln" d="M250 170 H430"/>
  <rect class="figbox-acc" x="560" y="90" width="120" height="52" rx="8"/><text x="620" y="116" class="figtx-acc" text-anchor="middle">大语言模型</text><text x="620" y="132" class="figtx-mut" text-anchor="middle">LLM</text>
  <path class="figln" d="M456 63 C520 63 520 110 558 112"/>
  <path class="figln" d="M456 170 C520 170 520 125 558 120"/>
  <polygon class="figfill-mut" points="558,107 570,114 557,119"/>
  <text x="508" y="236" class="figtx-mut" text-anchor="middle">③组织成一条带位置的序列</text>
  <rect class="figbox" x="560" y="200" width="120" height="40" rx="8"/><text x="620" y="225" class="figtx" text-anchor="middle">文字答案</text>
  <path class="figln" d="M620 142 V198"/><polygon class="figfill-mut" points="615,198 620,210 625,198"/>
  </svg>`
};

// POPE 混淆矩阵
FIGS["confusion"] = {
  cap: "POPE 混淆矩阵:FP(图里没有却答有)就是幻觉;FN 是漏判",
  svg: `<svg viewBox="0 0 470 280" role="img" aria-label="POPE混淆矩阵2乘2">
  <text x="250" y="22" class="figtx-mut" text-anchor="middle">模型回答</text>
  <text x="170" y="52" class="figtx-b" text-anchor="middle">答&quot;有&quot;</text>
  <text x="330" y="52" class="figtx-b" text-anchor="middle">答&quot;没有&quot;</text>
  <text x="22" y="120" class="figtx-b" text-anchor="middle" transform="rotate(-90 22 160)">真实</text>
  <text x="70" y="115" class="figtx-b" text-anchor="middle">真有</text>
  <text x="70" y="205" class="figtx-b" text-anchor="middle">真没有</text>
  <rect class="figcell-ok"  x="100" y="70"  width="140" height="80" rx="6"/><text x="170" y="105" class="figtx-b" text-anchor="middle">TP</text><text x="170" y="126" class="figtx-mut" text-anchor="middle">命中</text>
  <rect class="figcell-warn" x="260" y="70"  width="140" height="80" rx="6"/><text x="330" y="105" class="figtx-b" text-anchor="middle">FN</text><text x="330" y="126" class="figtx-mut" text-anchor="middle">漏判</text>
  <rect class="figcell-bad"  x="100" y="162" width="140" height="80" rx="6"/><text x="170" y="197" class="figtx-b" text-anchor="middle">FP</text><text x="170" y="218" class="figtx-mut" text-anchor="middle">幻觉·误报</text>
  <rect class="figcell-ok"  x="260" y="162" width="140" height="80" rx="6"/><text x="330" y="197" class="figtx-b" text-anchor="middle">TN</text><text x="330" y="218" class="figtx-mut" text-anchor="middle">正确否定</text>
  </svg>`
};

// 数据清洗漏斗(L5)
FIGS["datafunnel"] = {
  cap: "本示例的数量变化(教学示意数据):逐级过滤。图文相关性(CLIP)只做全局匹配粗筛,不能核数量/否定/小字;与评测集去重是防污染的关键一步。",
  svg: `<svg viewBox="0 0 560 320" role="img" aria-label="数据清洗漏斗">
  <text x="540" y="18" class="figtx-mut" text-anchor="end">教学示意数据</text>
  ${[
    ["原始抓取","10,000,000",470],
    ["去损坏 / 尺寸异常","9,215,000",410],
    ["CLIP 图文相关(全局粗筛)","6,911,000",330],
    ["近重去重","6,358,000",300],
    ["与评测集去重(防污染)","6,300,000",285],
  ].map((r,i)=>{const w=r[2],x=(560-w)/2,y=30+i*56;return `<rect class="figbox" x="${x}" y="${y}" width="${w}" height="40" rx="6"/><text x="280" y="${y+25}" class="figtx-b" text-anchor="middle">${r[0]} · ${r[1]}</text>`+(i<4?`<polygon class="figfill-mut" points="273,${y+44} 287,${y+44} 280,${y+53}"/>`:'');}).join("")}
  </svg>`
};

// 评测链路(L9)
FIGS["scoring"] = {
  cap: "一次评测的完整链路:每一步都可能出错或被操纵,换提取规则分数就会变",
  svg: `<svg viewBox="0 0 740 110" role="img" aria-label="评测链路五步">
  ${["模型原始输出","答案提取","规范化","判分","聚合"].map((t,i)=>{const x=10+i*146;return `<rect class="${i===1?'figbox-acc':'figbox'}" x="${x}" y="34" width="124" height="44" rx="8"/><text x="${x+62}" y="60" class="${i===1?'figtx-acc':'figtx'}" text-anchor="middle">${t}</text>`+(i<4?`<path class="figln" d="M${x+124} 56 H${x+144}"/><polygon class="figfill-mut" points="${x+140},51 ${x+150},56 ${x+140},61"/>`:'');}).join("")}
  <text x="72" y="98" class="figtx-mut" text-anchor="middle">自由文本</text>
  <text x="218" y="98" class="figtx-mut" text-anchor="middle">最易出错</text>
  </svg>`
};

// GUI Agent 闭环(L10)
FIGS["agentloop"] = {
  cap: "GUI Agent 操作闭环(观察→定位→动作→执行→回读→观察):一步点错会向后累积;不确定时应拒答/确认/回滚",
  svg: `<svg viewBox="0 0 480 310" role="img" aria-label="GUI Agent 操作闭环">
  <text x="240" y="155" class="figtx-acc" text-anchor="middle">GUI Agent</text>
  ${(()=>{const nodes=[["观察","截屏"],["定位","找元素坐标"],["动作","点击/输入"],["执行",""],["回读","新屏幕"]];
    const cx=240,cy=150,R=106;const P=nodes.map((n,i)=>{const a=-Math.PI/2+i*2*Math.PI/5;return {x:cx+R*Math.cos(a),y:cy+R*Math.sin(a)};});
    let r='';
    // directional arrows (drawn first, boxes on top)
    for(let i=0;i<5;i++){const p0=P[i],p1=P[(i+1)%5];let dx=p1.x-p0.x,dy=p1.y-p0.y;const L=Math.hypot(dx,dy);dx/=L;dy/=L;
      const off=60,sx=p0.x+dx*off,sy=p0.y+dy*off,ex=p1.x-dx*off,ey=p1.y-dy*off,px=-dy,py=dx;
      r+=`<line class="figln" x1="${sx.toFixed(0)}" y1="${sy.toFixed(0)}" x2="${ex.toFixed(0)}" y2="${ey.toFixed(0)}"/>`;
      r+=`<polygon class="figfill-mut" points="${ex.toFixed(0)},${ey.toFixed(0)} ${(ex-dx*13+px*6).toFixed(0)},${(ey-dy*13+py*6).toFixed(0)} ${(ex-dx*13-px*6).toFixed(0)},${(ey-dy*13-py*6).toFixed(0)}"/>`;}
    nodes.forEach((n,i)=>{const p=P[i];r+=`<rect class="figbox-acc" x="${(p.x-52).toFixed(0)}" y="${(p.y-20).toFixed(0)}" width="104" height="40" rx="8"/><text x="${p.x.toFixed(0)}" y="${(p.y-2).toFixed(0)}" class="figtx-b" text-anchor="middle">${n[0]}</text>`+(n[1]?`<text x="${p.x.toFixed(0)}" y="${(p.y+13).toFixed(0)}" class="figtx-mut" text-anchor="middle">${n[1]}</text>`:'');});
    return r;})()}
  <text x="240" y="302" class="figtx-mut" text-anchor="middle">回读后判断:完成→终止;不行→回到观察</text>
  </svg>`
};

// 视觉 token 数对比(Lab):两模型都可能是 576,但来路不同
FIGS["labtokens"] = {
  cap: "两模型都可能得到 576 视觉 token,但来路不同:LLaVA-1.5 把任何输入都缩放到 336²(故 672² 仍是 576);Qwen2.5-VL 用原生分辨率 + 2×2 合并(336²→144、672²→576)。柱高 ∝ token 数;token 数相等 ≠ 信息量相等。",
  svg: `<svg viewBox="0 0 560 230" role="img" aria-label="LLaVA与Qwen视觉token数对比">
  <text x="150" y="20" class="figtx-b" text-anchor="middle">LLaVA-1.5</text>
  <text x="410" y="20" class="figtx-b" text-anchor="middle">Qwen2.5-VL</text>
  <line class="figln" x1="24" y1="182" x2="536" y2="182"/>
  ${[
    ["figfill-acc","输入 336²",576,70],
    ["figfill-acc","输入 672²",576,185],
    ["figfill-grn","输入 336²",144,330],
    ["figfill-grn","输入 672²",576,445],
  ].map(r=>{const maxh=120,h=Math.max(16,r[2]/576*maxh),x=r[3],yb=182;return `<rect class="${r[0]}" x="${x}" y="${yb-h}" width="90" height="${h}" rx="5"/><text x="${x+45}" y="${yb-h-7}" class="figtx-b" text-anchor="middle">${r[2]}</text><text x="${x+45}" y="${yb+16}" class="figtx-mut" text-anchor="middle">${r[1]}</text>`;}).join("")}
  <text x="280" y="212" class="figtx-mut" text-anchor="middle">纵轴:视觉 token 数</text>
  </svg>`
};

module.exports = { FIGS };
