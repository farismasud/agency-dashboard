#!/usr/bin/env bash
# Sends a Claude Code hook event to the agency-dashboard backend.
# MUST NEVER block Claude Code: always exit 0, fail silently.
set -u

AGENCY_URL="${AGENCY_URL:-http://localhost:8090/events}"

INPUT="$(cat)"

# Fields per Claude Code hooks (verified against code.claude.com/docs/en/hooks
# at plan-writing time): hook_event_name, cwd, tool_name, tool_input,
# agent_type (SubagentStop only). subagent_type is not a native hook field —
# we derive it from agent_type on SubagentStop, and leave it empty on plain
# tool events fired outside a subagent (main-session tool calls), which the
# backend treats as an event with no dedicated avatar (skipped client-side).
EVENT_NAME=$(echo "$INPUT" | jq -r '.hook_event_name // empty')
PROJECT=$(echo "$INPUT" | jq -r '.cwd // empty')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // empty')
LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // empty')

[ -z "$PROJECT" ] && exit 0   # nothing to report without a project path
[ -z "$AGENT_TYPE" ] && exit 0 # v1 only tracks subagent activity, not main-session

SUMMARY="$TOOL_NAME"
[ -n "$LAST_MSG" ] && SUMMARY="${LAST_MSG:0:120}"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

PAYLOAD=$(jq -n \
  --arg project "$PROJECT" \
  --arg subagent_type "$AGENT_TYPE" \
  --arg event_type "$EVENT_NAME" \
  --arg tool_name "$TOOL_NAME" \
  --arg summary "$SUMMARY" \
  --arg timestamp "$TIMESTAMP" \
  '{project: $project, subagent_type: $subagent_type, event_type: $event_type, tool_name: $tool_name, summary: $summary, timestamp: $timestamp}')

curl -s -m 2 -X POST "$AGENCY_URL" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD" >/dev/null 2>&1

exit 0
