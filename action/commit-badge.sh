#!/usr/bin/env bash
#
# Commit the generated arch-score badge files to a dedicated orphan branch.
# Runs in a fresh throwaway clone so it never touches the consumer's checkout,
# and never re-triggers CI (the workflow watches the default branch, not this one).
set -euo pipefail

: "${ARCH_OUT:?ARCH_OUT not set}"
: "${GITHUB_TOKEN:?GITHUB_TOKEN not set}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY not set}"
BRANCH="${BADGE_BRANCH:-arch-score-badge}"

REMOTE="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

WORK="$(mktemp -d)"
cd "$WORK"
git init -q
git remote add origin "$REMOTE"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  git fetch -q --depth 1 origin "$BRANCH"
  git checkout -q -b "$BRANCH" FETCH_HEAD
else
  git checkout -q --orphan "$BRANCH"
fi

cp "$ARCH_OUT/badge.svg" arch-score-badge.svg
cp "$ARCH_OUT/badge.json" arch-score-badge.json
git add arch-score-badge.svg arch-score-badge.json

if git diff --cached --quiet; then
  echo "arch-score badge unchanged; nothing to commit."
  exit 0
fi

git commit -q -m "chore(arch-score): update badge [skip ci]"
git push -q origin "HEAD:$BRANCH"
echo "arch-score badge pushed to '$BRANCH'."
