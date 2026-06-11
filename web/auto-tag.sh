#!/usr/bin/env bash
# Create and push the next production deploy tag for leap-app.
# Tag format: leap_prod_app_001, leap_prod_app_002, ...
#
# Usage:
#   ./auto-tag.sh           # create tag on current HEAD and push to origin
#   DRY_RUN=1 ./auto-tag.sh # print next tag only, do not create or push

set -euo pipefail

TAG_PREFIX="leap_prod_app_"
TAG_REGEX="^leap_prod_app_[0-9]{3}$"

cd "$(dirname "$0")"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: not a git repository." >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Warning: working tree has uncommitted changes." >&2
fi

latest_tag=$(
  git tag -l "${TAG_PREFIX}*" | grep -E "$TAG_REGEX" | sort -V | tail -n 1 || true
)

if [ -z "$latest_tag" ]; then
  new_tag="${TAG_PREFIX}001"
else
  num=$(echo "$latest_tag" | grep -oE '[0-9]{3}$')
  new_num=$(printf "%03d" $((10#$num + 1)))
  new_tag="${TAG_PREFIX}${new_num}"
fi

echo "Repository: $(basename "$(git rev-parse --show-toplevel)")"
echo "Commit:     $(git rev-parse --short HEAD)"
echo "Last tag:   ${latest_tag:-<none>}"
echo "New tag:    $new_tag"

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "DRY_RUN=1 — skipped tag create and push."
  exit 0
fi

if git rev-parse "$new_tag" >/dev/null 2>&1; then
  echo "Error: tag $new_tag already exists locally." >&2
  exit 1
fi

git tag "$new_tag"
git push origin "$new_tag"

echo "Pushed new tag: $new_tag"
