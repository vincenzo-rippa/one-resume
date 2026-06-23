#!/usr/bin/env bash
#
# Fresh-clone demo gate: prove that a clean checkout with NO .env and NO sibling
# repos produces real artifacts under ./out using only the bundled examples/.
# Clones HEAD to a temp dir, installs, runs the demo exports, and asserts the
# expected files exist and are non-empty.
#
# Requires: git, npm, and typst on PATH (or TYPST_BIN). Run from anywhere.
#
#   scripts/smoke-fresh-clone.sh

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
CLONE="$WORK/clone"
trap 'rm -rf "$WORK"' EXIT

echo "▸ Cloning HEAD → $CLONE"
git clone --quiet "$REPO_ROOT" "$CLONE"
cd "$CLONE"

echo "▸ npm install"
npm install --silent

echo "▸ Demo exports (no .env ⇒ examples/ + ./out)"
npm run --silent pdf:all
npm run --silent doc:all

echo "▸ Asserting artifacts under ./out"
EXPECTED=(
  out/pdf/en-cv.pdf
  out/pdf/it-cv.pdf
  out/pdf/en-projects.pdf
  out/pdf/it-projects.pdf
  out/pdf/en-cv-freelance.pdf
  out/ats/cv/main/en-cv-ats.docx
  out/ats/projects/en-projects-ats.docx
  out/ats/cv/derived/en-cv-freelance-ats.docx
)
fail=0
for f in "${EXPECTED[@]}"; do
  if [ -s "$f" ]; then
    echo "  ok    $f"
  else
    echo "  MISS  $f"
    fail=1
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "✓ fresh-clone gate passed — zero-config demo produced all artifacts"
else
  echo "✗ fresh-clone gate failed"
fi
exit "$fail"
