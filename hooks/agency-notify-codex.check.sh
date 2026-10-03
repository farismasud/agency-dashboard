#!/usr/bin/env bash
# Run: hooks/agency-notify-codex.check.sh — asserts payloads from the Codex adapter (no network).
# NOTE: payload shapes are inferred from the Codex binary + Claude-style hooks.json, not captured live.
set -u
HOOK="$(dirname "$0")/agency-notify-codex.sh"
FIXTURE="$(dirname "$0")/fixtures/codex-pretooluse.json"
fail=0

run() { AGENCY_DRY_RUN=1 "$HOOK" <<<"$1"; }
expect() {
  local got; got=$(run "$1" | jq -r '"\(.agent)|\(.subagent_type)|\(.tool_name)|\(.summary)"' 2>/dev/null)
  if [ "$got" != "$2" ]; then echo "FAIL: expected [$2] got [$got]"; fail=1; fi
}

expect '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"shell","tool_input":{"command":["bash","-lc","npm test"]}}' 'codex|lead|Bash|Bash: npm test'
expect '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Bash","tool_input":{"command":"ls -la"}}' 'codex|lead|Bash|Bash: ls -la'
expect '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"apply_patch","tool_input":{"input":"*** Update File: src/a.go\n+x"}}' 'codex|lead|Edit|Edit: a.go'
expect '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"mcp__fetch__fetch","tool_input":{"url":"https://x.y/z"}}' 'codex|lead|mcp__fetch__fetch|mcp__fetch__fetch'
expect '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Bash","agent_type":"worker","tool_input":{"command":"ls"}}' 'codex|worker|Bash|Bash: ls'
expect '{"hook_event_name":"SessionEnd","cwd":"/p"}' 'codex|lead||Sesi Codex selesai'
expect '{"hook_event_name":"SubagentStop","cwd":"/p","agent_type":"worker","last_assistant_message":"done"}' 'codex|worker||done'

out=$(run "$(cat "$FIXTURE")" | jq -r .summary 2>/dev/null)
[ "$out" = "Bash: npm test" ] || { echo "FAIL: fixture summary [$out]"; fail=1; }

out=$(run '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"shell","tool_input":{"command":["bash","-lc","PGPASSWORD=hunter2 psql"]}}')
printf '%s' "$out" | grep -q hunter2 && { echo "FAIL: leaked secret"; fail=1; }

for junk in '' 'not json' '{}' '{"hook_event_name":"PreToolUse"}' '{"hook_event_name":"PostCompact","cwd":"/p"}'; do
  out=$(run "$junk"); rc=$?
  [ "$rc" = 0 ] && [ -z "$out" ] || { echo "FAIL: junk [$junk] rc=$rc out=[$out]"; fail=1; }
done

[ $fail = 0 ] && echo "agency-notify-codex.check: ok"
exit $fail
