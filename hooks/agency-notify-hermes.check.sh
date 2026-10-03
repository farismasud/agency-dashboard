#!/usr/bin/env bash
# Run: hooks/agency-notify-hermes.check.sh — asserts payloads from the Hermes adapter (no network).
set -u
HOOK="$(dirname "$0")/agency-notify-hermes.sh"
FIXTURE="$(dirname "$0")/fixtures/hermes-pre_tool_call.json"
fail=0

run() { AGENCY_DRY_RUN=1 "$HOOK" <<<"$1"; }
expect() { # expect <payload> <want "agent|subagent|tool|summary">
  local got; got=$(run "$1" | jq -r '"\(.agent)|\(.subagent_type)|\(.tool_name)|\(.summary)"' 2>/dev/null)
  if [ "$got" != "$2" ]; then echo "FAIL: expected [$2] got [$got]"; fail=1; fi
}

expect '{"hook_event_name":"pre_tool_call","cwd":"/p","tool_name":"terminal","tool_input":{"command":"npm test"}}' 'hermes|lead|Bash|Bash: npm test'
expect '{"hook_event_name":"pre_tool_call","cwd":"/p","tool_name":"read_file","tool_input":{"path":"/a/b/main.go"}}' 'hermes|lead|Read|Read: main.go'
expect '{"hook_event_name":"pre_tool_call","cwd":"/p","tool_name":"search_files","tool_input":{"pattern":"TODO"}}' 'hermes|lead|Grep|Grep: TODO'
expect '{"hook_event_name":"pre_tool_call","cwd":"/p","tool_name":"mcp_postgres_query","tool_input":{"sql":"select 1"}}' 'hermes|lead|mcp_postgres_query|mcp_postgres_query'
expect '{"hook_event_name":"pre_tool_call","cwd":"/p","tool_name":"terminal","args":{"command":"ls"}}' 'hermes|lead|Bash|Bash: ls'
expect '{"hook_event_name":"on_session_end","cwd":"/p"}' 'hermes|lead||Sesi Hermes selesai'
expect '{"hook_event_name":"pre_tool_call","cwd":"/p","tool_name":"terminal","tool_input":null}' 'hermes|lead|Bash|Bash'

# source-derived fixture lines
n=0
while IFS= read -r line; do
  n=$((n+1)); out=$(run "$line" | jq -r .agent 2>/dev/null)
  [ "$out" = hermes ] || { echo "FAIL: fixture line $n produced [$out]"; fail=1; }
done < <(jq -c '.[]' "$FIXTURE")

# secrets masked
out=$(run '{"hook_event_name":"pre_tool_call","cwd":"/p","tool_name":"terminal","tool_input":{"command":"PGPASSWORD=hunter2 psql"}}')
printf '%s' "$out" | grep -q hunter2 && { echo "FAIL: leaked secret"; fail=1; }

# junk input: exit 0, no output
for junk in '' 'not json' '{}' '{"hook_event_name":"pre_tool_call"}' '{"hook_event_name":"pre_llm_call","cwd":"/p"}'; do
  out=$(run "$junk"); rc=$?
  [ "$rc" = 0 ] && [ -z "$out" ] || { echo "FAIL: junk [$junk] rc=$rc out=[$out]"; fail=1; }
done

[ $fail = 0 ] && echo "agency-notify-hermes.check: ok"
exit $fail
