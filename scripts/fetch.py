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

UA = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
TIMEOUT = 25


def get(url, as_bytes=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        raw = r.read()
    return raw if as_bytes else raw.decode("utf-8", "replace")


def strip_html(s):
    s = s or ""
    s = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", s)      # markdown images
    s = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", s)   # markdown links -> text
    s = re.sub(r"[*_`]+", "", s)                      # md emphasis marks
    s = re.sub(r"<[^>]+>", " ", s)
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
# 2. AI News — merge several fresh, reliable AI-news RSS feeds.
#    (smol.ai's feed went stale/frozen, so we aggregate current sources and
#     sort by publish time; de-dup by link.)
# --------------------------------------------------------------------------- #
NEWS_FEEDS = [
    ("TechCrunch AI", "https://techcrunch.com/category/artificial-intelligence/feed/"),
    ("The Decoder", "https://the-decoder.com/feed/"),
    ("MIT Tech Review", "https://www.technologyreview.com/topic/artificial-intelligence/feed"),
]


def _parse_date(s):
    from email.utils import parsedate_to_datetime
    try:
        d = parsedate_to_datetime(s)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d
    except Exception:
        return datetime(1970, 1, 1, tzinfo=timezone.utc)


def fetch_news(limit=24):
    items = []
    for source, url in NEWS_FEEDS:
        try:
            root = ET.fromstring(get(url))
        except Exception as e:
            print(f"[news] {source}: {e}", file=sys.stderr)
            continue
        for item in root.iter("item"):
            def t(tag):
                el = item.find(tag)
                return el.text if el is not None and el.text else ""
            link = t("link").strip()
            if not link:
                continue
            items.append({
                "title": strip_html(t("title")),
                "summary": clamp(strip_html(t("description")), 320),
                "url": link,
                "date": t("pubDate").strip(),
                "source": source,
                "_ts": _parse_date(t("pubDate")),
            })
    # de-dup by url, newest first, with a soft per-source cap so one high-volume
    # feed (e.g. TechCrunch) doesn't crowd out the others.
    per_source_cap = 10
    seen, counts, uniq = set(), {}, []
    for it in sorted(items, key=lambda x: x["_ts"], reverse=True):
        if it["url"] in seen:
            continue
        if counts.get(it["source"], 0) >= per_source_cap:
            continue
        seen.add(it["url"])
        counts[it["source"]] = counts.get(it["source"], 0) + 1
        it.pop("_ts", None)
        uniq.append(it)
    return uniq[:limit]


# --------------------------------------------------------------------------- #
# 3. The Batch (DeepLearning.AI) — scrape issue list, then og: meta per issue
# --------------------------------------------------------------------------- #
BATCH_HOME = "https://www.deeplearning.ai/the-batch/"
# deeplearning.ai (Cloudflare) 403s datacenter IPs (GitHub Actions), so we read
# through the r.jina.ai reader proxy, which fetches server-side and returns text.
JINA = "https://r.jina.ai/"


def fetch_batch(limit=6):
    index = get(JINA + BATCH_HOME)
    nums = sorted({int(n) for n in re.findall(r"the-batch/issue-(\d+)", index)}, reverse=True)
    out = []
    for n in nums[:limit]:
        page_url = f"https://www.deeplearning.ai/the-batch/issue-{n}/"
        try:
            txt = get(JINA + page_url)
        except Exception as e:
            print(f"[batch] issue-{n}: {e}", file=sys.stderr)
            continue
        # jina reader output has "Title:", "Published Time:", then "Markdown Content:"
        mtitle = re.search(r"^Title:\s*(.+)$", txt, re.M)
        mpub = re.search(r"^Published Time:\s*(.+)$", txt, re.M)
        title = (mtitle.group(1).strip() if mtitle else f"The Batch — Issue {n}")
        # first substantive paragraph of the letter as summary
        body = txt.split("Markdown Content:", 1)[-1]
        summary = ""
        for para in body.split("\n"):
            p = strip_html(para).strip()
            if len(p) > 60 and not p.startswith(("Dear friends", "![", "Image", "[")):
                summary = p
                break
        out.append({
            "title": title,
            "summary": clamp(summary, 360),
            "image": "",
            "url": page_url,
            "issue": n,
            "date": (mpub.group(1).strip() if mpub else ""),
        })
    return out


# --------------------------------------------------------------------------- #
try:
    from enrich import enrich
except Exception:
    def enrich(items):
        return items


def run_one(name, fn):
    try:
        data = fn()
        data = enrich(data)
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
