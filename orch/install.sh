#!/usr/bin/env bash
# Installs orch from this repo to ~/.local/bin/orch (backup first) and seeds the vault chains.txt.
#   orch/install.sh          install
#   orch/install.sh --check  report whether the live copy matches the repo source (writes nothing)
set -eu
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="${ORCH_BIN:-$HOME/.local/bin/orch}"
VAULT="${ORCH_HOME:-$HOME/Documents/Obsidian Vault/Orchestrator}"

if [ "${1:-}" = "--check" ]; then
  if cmp -s "$SRC/orch" "$DEST"; then echo "ok       orch ($DEST)"; else echo "BEDA     orch: jalankan orch/install.sh"; exit 1; fi
  exit 0
fi

mkdir -p "$(dirname "$DEST")" "$VAULT"
if [ -f "$DEST" ] && ! cmp -s "$SRC/orch" "$DEST"; then
  cp -p "$DEST" "$DEST.bak-$(date +%Y%m%d-%H%M%S)"
fi
install -m 755 "$SRC/orch" "$DEST"
# never overwrite a chains.txt Faris may have edited
[ -f "$VAULT/chains.txt" ] || cp "$SRC/chains.txt" "$VAULT/chains.txt"
echo "installed $DEST (vault config: $VAULT/chains.txt)"
