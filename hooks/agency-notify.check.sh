#!/usr/bin/env bash
# Run: hooks/agency-notify.check.sh — asserts payloads built by agency-notify.sh (no network).
set -u
HOOK="$(dirname "$0")/agency-notify.sh"
fail=0

summary() { AGENCY_DRY_RUN=1 "$HOOK" <<<"$1" | jq -r '"\(.subagent_type)|\(.summary)"'; }
expect() {
  local got; got=$(summary "$1")
  if [ "$got" != "$2" ]; then echo "FAIL: expected [$2] got [$got]"; fail=1; fi
}
secret_free() {
  local got; got=$(summary "$1")
  if printf '%s' "$got" | grep -q "$2"; then echo "FAIL: leaked [$2] in [$got]"; fail=1; fi
}

expect '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Edit","agent_type":"dev","tool_input":{"file_path":"/a/b/Scene.tsx"}}' 'dev|Edit: Scene.tsx'
expect '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Bash","tool_input":{"command":"npm test"}}' 'lead|Bash: npm test'
expect '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"WebFetch","agent_type":"analyst","tool_input":{"url":"https://docs.example.com/x/y"}}' 'analyst|WebFetch: docs.example.com'
expect '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Agent","tool_input":{"subagent_type":"qa","description":"verify diff"}}' 'lead|Agent: qa — verify diff'
expect '{"hook_event_name":"SubagentStop","cwd":"/p","agent_type":"qa","last_assistant_message":"All tests pass"}' 'qa|All tests pass'

got=$(AGENCY_DRY_RUN=1 "$HOOK" <<<'{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Read","tool_input":{"file_path":"/a/x.go"}}' | jq -r .agent)
[ "$got" = "claude" ] || { echo "FAIL: agent expected claude got [$got]"; fail=1; }

secret_free '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Bash","tool_input":{"command":"curl -H \"Authorization: Bearer abc123xyz\" x"}}' 'abc123xyz'
secret_free '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Bash","tool_input":{"command":"PGPASSWORD=hunter2 psql"}}' 'hunter2'
secret_free '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Bash","tool_input":{"command":"export API_KEY=sk-live-1"}}' 'sk-live-1'
secret_free '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Bash","tool_input":{"command":"git clone https://user:pw@host/r"}}' 'user:pw'
secret_free '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Bash","tool_input":{"command":"echo ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"}}' 'ghp_ABCDEFGHIJ'

[ $fail = 0 ] && echo "agency-notify.check: ok"
exit $fail
