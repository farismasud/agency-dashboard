#!/usr/bin/env bash
# Run: hooks/install.check.sh — asserts install.sh reports status per tool and never writes outside tmp HOME.
set -u
INSTALL="$(dirname "$0")/install.sh"
fail=0
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

# empty HOME: every tool MISSING, snippets mention this repo's hook paths, nothing created
out=$(HOME="$tmp" "$INSTALL" 2>&1)
for tool in claude hermes codex agy; do
  echo "$out" | grep -qE "^MISSING +$tool " || { echo "FAIL: $tool not reported MISSING"; fail=1; }
done
echo "$out" | grep -q "agency-notify-hermes.sh" || { echo "FAIL: hermes snippet lacks adapter path"; fail=1; }
[ -z "$(find "$tmp" -type f)" ] || { echo "FAIL: install.sh wrote files: $(find "$tmp" -type f)"; fail=1; }

# registered everywhere: every tool ok
mkdir -p "$tmp/.claude" "$tmp/.hermes" "$tmp/.codex" "$tmp/.gemini/antigravity-cli/plugins/agency-notify"
echo '{"hooks":{"PreToolUse":[{"command":"/x/agency-notify.sh"}]}}' > "$tmp/.claude/settings.json"
echo 'command: "/x/agency-notify-hermes.sh"' > "$tmp/.hermes/config.yaml"
echo '{"command":"/x/agency-notify-codex.sh"}' > "$tmp/.codex/hooks.json"
echo '{"command":"/x/agency-notify-agy.sh"}' > "$tmp/.gemini/antigravity-cli/plugins/agency-notify/hooks.json"
out=$(HOME="$tmp" "$INSTALL" 2>&1)
for tool in claude hermes codex agy; do
  echo "$out" | grep -qE "^ok +$tool " || { echo "FAIL: $tool not reported ok"; fail=1; }
done

[ $fail = 0 ] && echo "install.check: ok"
exit $fail
