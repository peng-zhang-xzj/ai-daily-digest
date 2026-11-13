#!/usr/bin/env bash
# Refresh data locally and push to GitHub so the dashboard stays current.
# Reads the GitHub token from ~/.gh_token (never hardcoded). Safe to run daily.
# Exits 0 even if push is skipped/fails, so the digest step still proceeds.
set -uo pipefail

REPO="/mnt/bn/tns-user-interaction-safety-my/zhangpeng.xzj/ai-daily-digest"
cd "$REPO" || exit 1

echo "[refresh] fetching sources..."
python3 scripts/fetch.py || { echo "[refresh] fetch failed"; exit 0; }

TOKEN_FILE="$HOME/.gh_token"
if [ ! -s "$TOKEN_FILE" ]; then
  echo "[refresh] no ~/.gh_token -> skip push (data refreshed locally only)"
  exit 0
fi
TOKEN="$(tr -d '\r\n' < "$TOKEN_FILE")"

git add data/*.json
if git diff --cached --quiet; then
  echo "[refresh] no data change, nothing to push"
  exit 0
fi
git -c user.name="daily-digest-bot" -c user.email="noreply@local" \
    commit -q -m "data: auto refresh $(date -u +%Y-%m-%dT%H:%MZ)"

REMOTE="https://peng-zhang-xzj:${TOKEN}@github.com/peng-zhang-xzj/ai-daily-digest.git"
git -c pull.rebase=true pull --rebase -X theirs "$REMOTE" main >/dev/null 2>&1
if git push "$REMOTE" main >/dev/null 2>&1; then
  echo "[refresh] pushed OK"
else
  echo "[refresh] push failed (token revoked/network?) — data refreshed locally, digest still OK"
fi
exit 0
