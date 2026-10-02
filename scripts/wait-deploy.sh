#!/usr/bin/env bash
# scripts/wait-deploy.sh
# Efficient zero-overhead deployment watcher for Vercel/GitHub status.

set -euo pipefail

# Ensure proxy is applied if local proxy port is accessible
if [ -z "${https_proxy:-}" ] && nc -z 127.0.0.1 10808 2>/dev/null; then
  export https_proxy="http://127.0.0.1:10808"
  export http_proxy="http://127.0.0.1:10808"
fi

# Target commit SHA
SHA="${1:-$(git rev-parse HEAD)}"
REPO="QingYunA/Pagepod"
MAX_ATTEMPTS=30
SLEEP_SECS=5

echo "⏳ Polling Vercel deployment status for commit: $SHA ($REPO)"

for ((i=1; i<=MAX_ATTEMPTS; i++)); do
  STATUS_JSON=$(gh api "/repos/$REPO/commits/$SHA/statuses" 2>/dev/null || echo "[]")
  STATE=$(echo "$STATUS_JSON" | jq -r '.[0].state // "none"' 2>/dev/null || echo "none")
  DESC=$(echo "$STATUS_JSON" | jq -r '.[0].description // ""' 2>/dev/null || echo "")

  if [ "$STATE" = "success" ]; then
    echo "✓ [Attempt $i/$MAX_ATTEMPTS] Deployment succeeded! ($DESC)"
    exit 0
  elif [ "$STATE" = "failure" ] || [ "$STATE" = "error" ]; then
    echo "✗ [Attempt $i/$MAX_ATTEMPTS] Deployment failed with state '$STATE': $DESC"
    exit 1
  else
    echo "  -> [Attempt $i/$MAX_ATTEMPTS] State: $STATE (${DESC:-Waiting for Vercel...}), sleeping ${SLEEP_SECS}s..."
    sleep "$SLEEP_SECS"
  fi
done

echo "⚠️ Timed out waiting for deployment after $((MAX_ATTEMPTS * SLEEP_SECS)) seconds."
exit 1
