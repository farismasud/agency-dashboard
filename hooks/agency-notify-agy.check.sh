#!/usr/bin/env bash
# Run: hooks/agency-notify-agy.check.sh — asserts payloads from the agy adapter (no network).
# NOTE: payload shape is assumed Claude-compatible (agy plugins use Claude-style hooks.json); verified live in plan Task 7.
set -u
DIR="$(dirname "$0")"
HOOK="$DIR/agency-notify-agy.sh"
fail=0

run() { AGENCY_DRY_RUN=1 "$HOOK" <<<"$1"; }
expect() {
  local got; got=$(run "$1" | jq -r '"\(.agent)|\(.subagent_type)|\(.summary)"' 2>/dev/null)
  if [ "$got" != "$2" ]; then echo "FAIL: expected [$2] got [$got]"; fail=1; fi
}

expect '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Bash","tool_input":{"command":"npm test"}}' 'agy|lead|Bash: npm test'
expect '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Edit","agent_type":"dev","tool_input":{"file_path":"/a/x.go"}}' 'agy|dev|Edit: x.go'
expect '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"view_file","tool_input":{"AbsolutePath":"/a/x.go"}}' 'agy|lead|view_file'

# a stray AGENCY_AGENT in the caller's environment must not relabel agy as someone else
got=$(AGENCY_AGENT=codex AGENCY_DRY_RUN=1 "$HOOK" <<<'{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Bash","tool_input":{"command":"ls"}}' | jq -r .agent)
[ "$got" = "agy" ] || { echo "FAIL: env override leaked, got [$got]"; fail=1; }

out=$(run '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Bash","tool_input":{"command":"PGPASSWORD=hunter2 psql"}}')
printf '%s' "$out" | grep -q hunter2 && { echo "FAIL: leaked secret"; fail=1; }

for junk in '' 'not json' '{}'; do
  out=$(run "$junk"); rc=$?
  [ "$rc" = 0 ] && [ -z "$out" ] || { echo "FAIL: junk [$junk] rc=$rc out=[$out]"; fail=1; }
done

# plugin bundle: valid for agy, and its hook command points at this adapter
if command -v agy >/dev/null 2>&1; then
  tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
  sed "s#@HOOKS_DIR@#$(cd "$DIR" && pwd)#g" "$DIR/agy-plugin/hooks.json.in" > "$tmp/hooks.json"
  cp "$DIR/agy-plugin/plugin.json" "$tmp/plugin.json"
  agy plugin validate "$tmp" >/dev/null 2>&1 || { echo "FAIL: agy plugin validate rejected the bundle"; fail=1; }
  jq -e '.hooks.PreToolUse[0].hooks[0].command | endswith("agency-notify-agy.sh")' "$tmp/hooks.json" >/dev/null || { echo "FAIL: hooks.json does not call the adapter"; fail=1; }
fi

[ $fail = 0 ] && echo "agency-notify-agy.check: ok"
exit $fail
