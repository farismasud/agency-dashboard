#!/usr/bin/env bash
# Sends a Claude Code hook event to the agency-dashboard backend.
# MUST NEVER block Claude Code: always exit 0, fail silently.
set -u

AGENCY_URL="${AGENCY_URL:-http://localhost:8090/events}"

INPUT="$(cat)"

# Hook fields: hook_event_name, cwd, tool_name, tool_input, agent_type
# (present when the hook fires inside a subagent), last_assistant_message
# (SubagentStop). Events with no agent_type come from the main session and
# are reported as the "lead" avatar.
EVENT_NAME=$(echo "$INPUT" | jq -r '.hook_event_name // empty')
PROJECT=$(echo "$INPUT" | jq -r '.cwd // empty')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // empty')
LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // empty')

[ -z "$PROJECT" ] && exit 0 # nothing to report without a project path
[ -z "$AGENT_TYPE" ] && AGENT_TYPE="lead"

# Short, human-readable hint of what the tool is touching (file name, command,
# search pattern...). Never the full input: file contents stay local.
DETAIL=$(echo "$INPUT" | jq -r '
  (.tool_input // {}) as $i
  | (.tool_name // "") as $t
  | if $t == "Bash" then ($i.command // "")
    elif ($t | test("^(Edit|MultiEdit|Write|Read|NotebookEdit)$")) then (($i.file_path // $i.notebook_path // "") | split("/") | last)
    elif $t == "Grep" or $t == "Glob" then ($i.pattern // "")
    elif $t == "WebFetch" then (($i.url // "") | sub("^[a-z]+://"; "") | split("/") | first)
    elif $t == "WebSearch" then ($i.query // "")
    elif $t == "Agent" or $t == "Task" then (($i.subagent_type // "agent") + " — " + ($i.description // ""))
    else "" end' 2>/dev/null | tr '\n\t' '  ')

# Commands can carry secrets: mask key=value credentials, bearer tokens,
# URL userinfo and long token-looking strings before anything leaves the machine.
if [ "$TOOL_NAME" = "Bash" ]; then
  DETAIL=$(printf '%s' "$DETAIL" | sed -E \
    -e 's/(bearer|basic) +[^ ]+/\1 ***/Ig' \
    -e 's/((pass(word|wd)?|pwd|token|secret|api[_-]?key|access[_-]?key|auth[a-z_]*)["'"'"']?[=: ]+)[^ ]+/\1***/Ig' \
    -e 's#://[^/@ ]+@#://***@#g' \
    -e 's/[A-Za-z0-9_+/=-]{32,}/***/g')
fi
DETAIL=$(printf '%s' "$DETAIL" | tr -s ' ' | sed 's/^ //; s/ $//' | cut -c1-80)

SUMMARY="$TOOL_NAME"
[ -n "$DETAIL" ] && SUMMARY="$TOOL_NAME: $DETAIL"
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

[ -n "${AGENCY_DRY_RUN:-}" ] && { echo "$PAYLOAD"; exit 0; }

curl -s -m 2 -X POST "$AGENCY_URL" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD" >/dev/null 2>&1

exit 0
