#!/usr/bin/env bash
# Claude Code hook adapter: translates a Claude hook payload into AGENCY_* vars
# and hands it to the shared emitter (sanitising, summary, POST).
# MUST NEVER block Claude Code: always exit 0, fail silently.
set -u

EMIT="$(dirname "$(readlink -f "$0")")/agency-emit.sh"
INPUT="$(cat)"

# Hook fields: hook_event_name, cwd, tool_name, tool_input, agent_type
# (present when the hook fires inside a subagent), last_assistant_message
# (SubagentStop). Events with no agent_type come from the main session and
# are reported as the "lead" avatar.
EVENT_NAME=$(echo "$INPUT" | jq -r '.hook_event_name // empty' 2>/dev/null)
PROJECT=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // empty' 2>/dev/null)
LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // empty' 2>/dev/null)

[ -z "$PROJECT" ] && exit 0 # nothing to report without a project path

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
    else "" end' 2>/dev/null)

AGENCY_AGENT="${AGENCY_AGENT:-claude}" \
AGENCY_PROJECT="$PROJECT" \
AGENCY_SUBAGENT_TYPE="${AGENT_TYPE:-lead}" \
AGENCY_EVENT_TYPE="$EVENT_NAME" \
AGENCY_TOOL_NAME="$TOOL_NAME" \
AGENCY_DETAIL="$DETAIL" \
AGENCY_LAST_MSG="$LAST_MSG" \
  "$EMIT"

exit 0
