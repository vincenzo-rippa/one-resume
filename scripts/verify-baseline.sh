#!/usr/bin/env bash
#
# Golden verification: prove a change is pure restructuring by rendering the
# maintainer's real content with both the current working tree and a baseline
# git ref, then byte-comparing the STABLE projections — parser JSON, extracted
# PDF text (`pdftotext -layout`), DOCX `word/document.xml`, and content JSON.
# (Raw PDF/DOCX bytes are not reproducible; their extracted text/xml are.)
#
# No golden fixtures are committed — the content is private, so we regenerate
# both sides on the fly. The baseline ref must be a post-refactor commit (it is
# driven through the same `one-resume` CLI).
#
# Usage:
#   scripts/verify-baseline.sh [BASELINE_REF]      (default: HEAD~1)
#   CONTENT_DIR=/path scripts/verify-baseline.sh <ref>
#
# Requires: node + the workspace installed, typst on PATH (or TYPST_BIN),
#           pdftotext (poppler) and unzip.

set -u
BASELINE_REF="${1:-HEAD~1}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTENT_DIR="${CONTENT_DIR:-$(cd "$REPO_ROOT/../pro-profile-source" && pwd)}"
CLI="apps/cli/src/bin.ts"

# Real markdown the harness exercises (relative to CONTENT_DIR), with template.
CV_FILES=(
  "cv/main/en-cv.md:main"
  "cv/main/it-cv.md:main"
  "cv/freelance/en-cv-freelance.md:freelance"
  "projects/en-projects.md:projects"
  "projects/it-projects.md:projects"
)

WORK="$(mktemp -d)"
BASE_WT="$WORK/baseline"
OUT="$WORK/out"
mkdir -p "$OUT/base" "$OUT/head"
fail=0

cleanup() {
  git -C "$REPO_ROOT" worktree remove --force "$BASE_WT" >/dev/null 2>&1
  rm -rf "$WORK"
}
trap cleanup EXIT

echo "Baseline ref : $BASELINE_REF"
echo "Content dir  : $CONTENT_DIR"
echo "Preparing baseline worktree…"
git -C "$REPO_ROOT" worktree add --detach "$BASE_WT" "$BASELINE_REF" >/dev/null
( cd "$BASE_WT" && npm install >/dev/null 2>&1 )

# Pin CONTENT_DIR for both trees so config-driven commands (sync, special) read
# the same real content regardless of where each worktree lives.
run() { ( cd "$1" && CONTENT_DIR="$CONTENT_DIR" npx tsx "$CLI" "${@:2}" ); }

check() { # label baseFile headFile
  if diff -q "$2" "$3" >/dev/null 2>&1; then
    echo "  OK   $1"
  else
    echo "  DIFF $1"
    fail=1
  fi
}

echo "### Parser JSON"
for f in "${CV_FILES[@]}"; do
  md="${f%%:*}"; n="$(echo "$md" | tr '/' '_')"
  run "$BASE_WT" parse "$CONTENT_DIR/$md" >"$OUT/base/parse_$n.json" 2>/dev/null
  run "$REPO_ROOT" parse "$CONTENT_DIR/$md" >"$OUT/head/parse_$n.json" 2>/dev/null
  check "parse $md" "$OUT/base/parse_$n.json" "$OUT/head/parse_$n.json"
done

echo "### PDF (extracted text)"
for f in "${CV_FILES[@]}"; do
  md="${f%%:*}"; tmpl="${f##*:}"; n="$(echo "$md" | tr '/' '_')"
  run "$BASE_WT" pdf --input "$CONTENT_DIR/$md" --template "$tmpl" --out "$OUT/base/$n.pdf" >/dev/null 2>&1
  run "$REPO_ROOT" pdf --input "$CONTENT_DIR/$md" --template "$tmpl" --out "$OUT/head/$n.pdf" >/dev/null 2>&1
  pdftotext -layout "$OUT/base/$n.pdf" "$OUT/base/$n.txt" 2>/dev/null
  pdftotext -layout "$OUT/head/$n.pdf" "$OUT/head/$n.txt" 2>/dev/null
  check "pdf $md" "$OUT/base/$n.txt" "$OUT/head/$n.txt"
done

echo "### PDF special"
run "$BASE_WT" special >/dev/null 2>&1
run "$REPO_ROOT" special >/dev/null 2>&1
pdftotext -layout "$BASE_WT/printed/pdf/it-cv-special.pdf" "$OUT/base/special.txt" 2>/dev/null
pdftotext -layout "$REPO_ROOT/printed/pdf/it-cv-special.pdf" "$OUT/head/special.txt" 2>/dev/null
check "pdf special" "$OUT/base/special.txt" "$OUT/head/special.txt"

echo "### DOCX (word/document.xml)"
for f in "${CV_FILES[@]}"; do
  md="${f%%:*}"; tmpl="${f##*:}"; n="$(echo "$md" | tr '/' '_')"
  [ "$tmpl" = "projects" ] && tmpl="projects"
  run "$BASE_WT" docx --input "$CONTENT_DIR/$md" --template "$tmpl" --out "$OUT/base/$n.docx" >/dev/null 2>&1
  run "$REPO_ROOT" docx --input "$CONTENT_DIR/$md" --template "$tmpl" --out "$OUT/head/$n.docx" >/dev/null 2>&1
  unzip -p "$OUT/base/$n.docx" word/document.xml >"$OUT/base/$n.xml" 2>/dev/null
  unzip -p "$OUT/head/$n.docx" word/document.xml >"$OUT/head/$n.xml" 2>/dev/null
  check "docx $md" "$OUT/base/$n.xml" "$OUT/head/$n.xml"
done

echo "### Content JSON"
run "$BASE_WT" sync --dry-run >"$OUT/base/content.txt" 2>/dev/null
run "$REPO_ROOT" sync --dry-run >"$OUT/head/content.txt" 2>/dev/null
check "content sync" "$OUT/base/content.txt" "$OUT/head/content.txt"

echo
if [ "$fail" -eq 0 ]; then
  echo "✓ baseline verified — every projection is byte-identical to $BASELINE_REF"
else
  echo "✗ differences found — see above"
fi
exit "$fail"
