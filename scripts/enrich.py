#!/usr/bin/env python3
"""Optional Chinese enrichment: turn each item into {title_zh, tldr}.

Uses any OpenAI-compatible chat endpoint (DeepSeek by default). Activated only
when an API key is present in the environment; otherwise it's a no-op and the
frontend falls back to original English text.

Env:
  LLM_API_KEY  (or DEEPSEEK_API_KEY)   required to activate
  LLM_BASE_URL default https://api.deepseek.com
  LLM_MODEL    default deepseek-chat

Results are cached in data/cache_zh.json keyed by item id, so each item is only
translated once -> daily cost stays tiny and runs stay fast.
"""
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_PATH = ROOT / "data" / "cache_zh.json"

API_KEY = os.environ.get("LLM_API_KEY") or os.environ.get("DEEPSEEK_API_KEY") or ""
BASE_URL = os.environ.get("LLM_BASE_URL", "https://api.deepseek.com").rstrip("/")
MODEL = os.environ.get("LLM_MODEL", "deepseek-chat")
BATCH = 8

PROMPT = (
    "你是资深 AI 资讯编辑。下面是若干条英文 AI 论文/新闻，每条有 id、title、summary。\n"
    "为每条生成中文：\n"
    "- title_zh: 精炼的中文标题，≤28字，专业术语可保留英文缩写。\n"
    "- tldr: 一句话说清它做了什么或为什么值得看，≤45字，中文，不要套话。\n"
    "严格返回 JSON：{\"items\":[{\"id\":\"...\",\"title_zh\":\"...\",\"tldr\":\"...\"}]}，"
    "id 原样对应，不要多余解释。\n\n输入：\n"
)


def load_cache():
    if CACHE_PATH.exists():
        try:
            return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_cache(cache):
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


def call_llm(batch):
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "只输出合法 JSON。"},
            {"role": "user", "content": PROMPT + json.dumps(batch, ensure_ascii=False)},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "max_tokens": 2000,
    }
    req = urllib.request.Request(
        f"{BASE_URL}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        resp = json.loads(r.read().decode("utf-8"))
    content = resp["choices"][0]["message"]["content"]
    data = json.loads(content)
    out = {}
    for it in data.get("items", []):
        if it.get("id"):
            out[str(it["id"])] = {
                "title_zh": (it.get("title_zh") or "").strip(),
                "tldr": (it.get("tldr") or "").strip(),
            }
    return out


def enrich(items):
    """items: list of dicts with at least title/summary and a stable 'url' or 'title'.
    Mutates each item in-place adding title_zh / tldr when available."""
    if not API_KEY:
        print("[enrich] no API key -> skip (frontend uses English fallback)", file=sys.stderr)
        return items

    cache = load_cache()
    pending = []
    for it in items:
        key = it.get("url") or it.get("title") or ""
        it["_k"] = key
        if key in cache:
            it["title_zh"] = cache[key].get("title_zh", "")
            it["tldr"] = cache[key].get("tldr", "")
        else:
            pending.append(it)

    for i in range(0, len(pending), BATCH):
        chunk = pending[i:i + BATCH]
        batch = [{"id": it["_k"],
                  "title": it.get("title", ""),
                  "summary": (it.get("summary", "") or "")[:500]} for it in chunk]
        try:
            res = call_llm(batch)
        except Exception as e:
            print(f"[enrich] batch {i//BATCH} failed: {e}", file=sys.stderr)
            continue
        for it in chunk:
            r = res.get(it["_k"])
            if r:
                it["title_zh"] = r["title_zh"]
                it["tldr"] = r["tldr"]
                cache[it["_k"]] = r
        save_cache(cache)
        time.sleep(0.4)

    for it in items:
        it.pop("_k", None)
    return items
