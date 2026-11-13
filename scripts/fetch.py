#!/usr/bin/env python3
"""Fetch the three sources into data/*.json.

Sources:
  - Hugging Face Daily Papers   (JSON API)
  - AI News / smol.ai           (RSS)
  - The Batch (DeepLearning.AI)  (HTML index scrape)

No third-party deps: stdlib only, so it runs anywhere (incl. GitHub Actions)
with zero `pip install`. Each source degrades gracefully: a failure writes an
empty list + an error note instead of crashing the whole run.
"""
import json
import re
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from html import unescape
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)

UA = {"User-Agent": "ai-daily-digest/1.0 (+https://github.com/)"}
TIMEOUT = 25


def get(url, as_bytes=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        raw = r.read()
    return raw if as_bytes else raw.decode("utf-8", "replace")


def strip_html(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    return unescape(re.sub(r"\s+", " ", s)).strip()


def clamp(s, n):
    s = s or ""
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


# --------------------------------------------------------------------------- #
# 1. Hugging Face Daily Papers
# --------------------------------------------------------------------------- #
def fetch_hf(days_back=3, limit=40):
    items = []
    for d in range(days_back):
        day = (datetime.now(timezone.utc) - timedelta(days=d)).strftime("%Y-%m-%d")
        try:
            data = json.loads(get(f"https://huggingface.co/api/daily_papers?date={day}"))
        except Exception as e:
            print(f"[hf] {day}: {e}", file=sys.stderr)
            continue
        for row in data:
            p = row.get("paper", {})
            pid = p.get("id", "")
            summary = p.get("ai_summary") or p.get("summary") or ""
            authors = [a.get("name", "") for a in p.get("authors", []) if a.get("name")]
            items.append({
                "title": strip_html(p.get("title", "")).strip(),
                "summary": clamp(strip_html(summary), 320),
                "authors": authors[:4],
                "upvotes": p.get("upvotes", 0),
                "url": f"https://huggingface.co/papers/{pid}" if pid else "",
                "arxiv": f"https://arxiv.org/abs/{pid}" if pid else "",
                "date": day,
            })
    # de-dup by url, keep highest upvotes, sort by upvotes desc
    seen = {}
    for it in items:
        k = it["url"] or it["title"]
        if k not in seen or it["upvotes"] > seen[k]["upvotes"]:
            seen[k] = it
    out = sorted(seen.values(), key=lambda x: (-x["upvotes"], x["title"]))
    return out[:limit]


# --------------------------------------------------------------------------- #
# 2. AI News (smol.ai)
# --------------------------------------------------------------------------- #
def fetch_news(limit=20):
    xml = get("https://news.smol.ai/rss.xml")
    root = ET.fromstring(xml)
    out = []
    for item in root.iter("item"):
        def t(tag):
            el = item.find(tag)
            return el.text if el is not None and el.text else ""
        out.append({
            "title": strip_html(t("title")),
            "summary": clamp(strip_html(t("description")), 400),
            "url": t("link").strip(),
            "date": t("pubDate").strip(),
        })
        if len(out) >= limit:
            break
    return out


# --------------------------------------------------------------------------- #
# 3. The Batch (DeepLearning.AI) — scrape issue list, then og: meta per issue
# --------------------------------------------------------------------------- #
def fetch_batch(limit=6):
    index = get("https://www.deeplearning.ai/the-batch/")
    nums = sorted({int(n) for n in re.findall(r"the-batch/issue-(\d+)", index)}, reverse=True)
    out = []
    for n in nums[:limit]:
        url = f"https://www.deeplearning.ai/the-batch/issue-{n}/"
        try:
            html = get(url)
        except Exception as e:
            print(f"[batch] issue-{n}: {e}", file=sys.stderr)
            continue

        def og(prop):
            m = re.search(
                rf'<meta[^>]+property=["\']og:{prop}["\'][^>]+content=["\']([^"\']*)["\']',
                html,
            )
            return unescape(m.group(1)) if m else ""

        out.append({
            "title": og("title") or f"The Batch — Issue {n}",
            "summary": clamp(strip_html(og("description")), 400),
            "image": og("image"),
            "url": url,
            "issue": n,
        })
    return out


# --------------------------------------------------------------------------- #
def run_one(name, fn):
    try:
        data = fn()
        (DATA / f"{name}.json").write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"[{name}] ok: {len(data)} items")
        return len(data), None
    except Exception as e:
        (DATA / f"{name}.json").write_text("[]", encoding="utf-8")
        print(f"[{name}] FAILED: {e}", file=sys.stderr)
        return 0, str(e)


def main():
    meta = {"updated_at": datetime.now(timezone.utc).isoformat(), "sources": {}}
    for name, fn in (("papers", fetch_hf), ("news", fetch_news), ("batch", fetch_batch)):
        count, err = run_one(name, fn)
        meta["sources"][name] = {"count": count, "error": err}
    (DATA / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("meta:", json.dumps(meta["sources"], ensure_ascii=False))


if __name__ == "__main__":
    main()
