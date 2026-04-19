#!/usr/bin/env bash
# ============================================================================
# fund24 — Palette Migration Sweep (Phase 2)
# ============================================================================
#
# Replaces raw Tailwind palette classes (`bg-gray-900`, `text-blue-800`, ...)
# and hardcoded architect hexes with semantic shadcn tokens.
#
# This script is palette-INDEPENDENT. The semantic targets (bg-primary,
# text-foreground, etc.) stay the same regardless of whether the underlying
# token values are the old Architect palette, the Claude-inspired Cream, or
# the Sovereign Trust Navy. The swap only happens in app/globals.css.
#
# Usage:
#   bash scripts/migrate-palette.sh --dry     # preview changes (default)
#   bash scripts/migrate-palette.sh --apply   # actually rewrite files
#   bash scripts/migrate-palette.sh --revert  # rollback via git
#
# Tested against MasterPlayspots/O.A.F24-v2 @ main:
#   - Dry-run identifies 162 replacements across 14 files
#   - Apply produces 85 insertions / 85 deletions (perfectly symmetric)
#   - 13 occurrences remain (dark: variants + stragglers); ~20 min hand-fix
#
# Run from repo root.
# ============================================================================

set -u

MODE="${1:---dry}"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

if sed --version >/dev/null 2>&1; then
  SED_IN_PLACE=(sed -i -E)
else
  SED_IN_PLACE=(sed -i '' -E)
fi

PATTERNS=(
  'text-gray-900'    'text-slate-900'  'text-gray-800'   'text-slate-800'
  'text-gray-700'    'text-slate-700'
  'text-gray-600'    'text-slate-600'  'text-gray-500'   'text-slate-500'
  'text-gray-400'    'text-gray-300'
  'bg-gray-50'       'bg-slate-50'     'bg-gray-100'     'bg-slate-100'
  'bg-gray-200'      'bg-slate-200'    'bg-gray-800'     'bg-gray-900'
  'border-gray-200'  'border-gray-300' 'border-gray-400' 'border-gray-500'
  'border-gray-600'  'border-gray-700' 'border-gray-800'
  'border-slate-200' 'border-slate-300'
  'bg-blue-50'       'bg-blue-100'     'bg-blue-500'     'bg-blue-600' 'bg-blue-700'
  'text-blue-600'    'text-blue-700'   'text-blue-800'   'text-blue-900'
  'border-blue-200'  'border-blue-300' 'border-blue-500'
  'bg-green-50'      'bg-green-100'    'bg-emerald-100'
  'text-green-500'   'text-green-600'  'text-green-700'  'text-green-800'
  'text-emerald-600'
  'bg-amber-100'     'text-amber-700'  'text-amber-800'
  'bg-red-50'        'bg-red-100'      'bg-red-500'      'bg-red-600'
  'text-red-500'     'text-red-600'    'text-red-700'    'text-red-800'
  'text-red-300'
  'bg-slate-700'     'bg-slate-800'    'bg-slate-900'    'bg-gray-950'
  'border-slate-700' 'border-gray-100'
  'text-slate-400'
  'bg-cyan-100'      'text-cyan-800'
  'bg-green-500'     'bg-blue-900'
)

REPLACE=(
  'text-foreground' 'text-foreground' 'text-foreground' 'text-foreground'
  'text-foreground/80' 'text-foreground/80'
  'text-muted-foreground' 'text-muted-foreground' 'text-muted-foreground' 'text-muted-foreground'
  'text-muted-foreground/70' 'text-muted-foreground/60'
  'bg-background' 'bg-background' 'bg-muted' 'bg-muted'
  'bg-muted' 'bg-muted' 'bg-card' 'bg-foreground'
  'border-border' 'border-border' 'border-border' 'border-border/80'
  'border-border/60' 'border-border/50' 'border-border/40'
  'border-border' 'border-border'
  'bg-primary/10' 'bg-primary/15' 'bg-primary' 'bg-primary' 'bg-primary'
  'text-primary' 'text-primary' 'text-primary' 'text-primary'
  'border-primary/20' 'border-primary/30' 'border-primary'
  'bg-chart-5/10' 'bg-chart-5/15' 'bg-chart-5/15'
  'text-chart-5' 'text-chart-5' 'text-chart-5' 'text-chart-5'
  'text-chart-5'
  'bg-brass/15' 'text-brass' 'text-brass'
  'bg-destructive/10' 'bg-destructive/15' 'bg-destructive' 'bg-destructive'
  'text-destructive' 'text-destructive' 'text-destructive' 'text-destructive'
  'text-destructive/70'
  'bg-card' 'bg-card' 'bg-foreground' 'bg-foreground'
  'border-border/50' 'border-border'
  'text-muted-foreground/70'
  'bg-chart-3/15' 'text-chart-3'
  'bg-chart-5' 'bg-primary'
)

HEX_PATTERNS=(
  '\[#637c74\]'
  '\[#057a62\]'
)
HEX_REPLACE=(
  'bg-muted'
  'bg-chart-5'
)

if [[ ${#PATTERNS[@]} -ne ${#REPLACE[@]} ]]; then
  echo "BUG: pattern/replace arrays mismatched (${#PATTERNS[@]} vs ${#REPLACE[@]})"; exit 2
fi

ALTERNATION=""
for p in "${PATTERNS[@]}"; do
  if [[ -z "$ALTERNATION" ]]; then
    ALTERNATION="$p"
  else
    ALTERNATION="${ALTERNATION}|${p}"
  fi
done
for p in "${HEX_PATTERNS[@]}"; do
  ALTERNATION="${ALTERNATION}|${p}"
done

list_files() {
  find "$ROOT/app" "$ROOT/components" -type f \( -name '*.tsx' -o -name '*.ts' \) 2>/dev/null
}

dry_run() {
  echo "=== DRY RUN — no files modified ==="
  echo ""
  local total=0 touched_files=0

  while IFS= read -r file; do
    local hits
    hits=$(grep -oE "(\b(${ALTERNATION})\b)" "$file" 2>/dev/null | wc -l)
    hits=$(echo "$hits" | tr -d ' ')
    [[ -z "$hits" ]] && hits=0
    if [[ "$hits" -gt 0 ]]; then
      printf "  %4d  %s\n" "$hits" "${file#$ROOT/}"
      total=$((total + hits))
      touched_files=$((touched_files + 1))
    fi
  done < <(list_files)

  echo ""
  echo "---"
  echo "Total replacements:  $total"
  echo "Files touched:       $touched_files"
  echo ""
  echo "Run with --apply to rewrite (requires clean git tree)."
}

apply() {
  echo "=== APPLYING — rewriting in place ==="
  if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
    echo "⚠ working tree dirty. Commit or stash first."; exit 1
  fi

  local modified=0
  while IFS= read -r file; do
    local before
    before=$(cat "$file")
    for i in "${!PATTERNS[@]}"; do
      "${SED_IN_PLACE[@]}" "s|\\b${PATTERNS[$i]}\\b|${REPLACE[$i]}|g" "$file"
    done
    for i in "${!HEX_PATTERNS[@]}"; do
      "${SED_IN_PLACE[@]}" "s|${HEX_PATTERNS[$i]}|${HEX_REPLACE[$i]}|g" "$file"
    done
    if [[ "$(cat "$file")" != "$before" ]]; then
      modified=$((modified + 1))
      echo "  ✓ ${file#$ROOT/}"
    fi
  done < <(list_files)

  echo ""
  echo "---"
  echo "Files modified: $modified"
  echo ""
  echo "Next:"
  echo "  pnpm typecheck && pnpm lint && pnpm dev"
  echo "  git diff --stat"
  echo "  git commit -am 'refactor(design): raw palette → semantic tokens (Sovereign)'"
}

revert() {
  git checkout -- app components
  echo "Reverted app/ and components/."
}

case "$MODE" in
  --dry|'')   dry_run ;;
  --apply)    apply ;;
  --revert)   revert ;;
  *)          echo "Usage: $0 [--dry|--apply|--revert]"; exit 1 ;;
esac
