#!/usr/bin/env bash
# Codex hook adapter: translates a Codex hook payload into AGENCY_* vars for the
# shared emitter. MUST NEVER block Codex: always exit 0, print nothing.
set -u

EMIT="$(dirname "$(readlink -f "$0")")/agency-emit.sh"
INPUT="$(cat)"

PROJECT=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
[ -z "$PROJECT" ] && exit 0

EVENT_NAME=$(echo "$INPUT" | jq -r '.hook_event_name // empty' 2>/dev/null)
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // empty' 2>/dev/null)
LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // empty' 2>/dev/null)

# payload-shape: tool name + arguments; the shell command may be a string or an argv array.
MAPPED=$(echo "$INPUT" | jq -r '
  (.tool_input // {}) as $i
  | (.tool_name // "") as $t
  | if   ($t == "shell" or $t == "Bash" or $t == "local_shell" or $t == "exec_command") then
      "Bash\t" + (($i.command // $i.cmd // "") | if type == "array" then (if (.[0] // "") | test("sh$") then (.[2:] | join(" ")) else join(" ") end) else . end)
    elif ($t == "apply_patch") then
      "Edit\t" + ((($i.input // $i.patch // "") | capture("\\*\\*\\* (Update|Add|Delete) File: (?<f>[^\n]+)") // {f: ""}) | .f | split("/") | last)
    else $t + "\t" end' 2>/dev/null)

TOOL_NAME="${MAPPED%%$'\t'*}"
DETAIL="${MAPPED#*$'\t'}"
[ "$EVENT_NAME" = "SessionEnd" ] && LAST_MSG="Sesi Codex selesai"
[ -z "$TOOL_NAME" ] && [ -z "$LAST_MSG" ] && exit 0 # tool-less event with nothing to say: skip, no empty bubble

AGENCY_AGENT=codex \
AGENCY_PROJECT="$PROJECT" \
AGENCY_SUBAGENT_TYPE="${AGENT_TYPE:-lead}" \
AGENCY_EVENT_TYPE="$EVENT_NAME" \
AGENCY_TOOL_NAME="$TOOL_NAME" \
AGENCY_DETAIL="$DETAIL" \
AGENCY_LAST_MSG="$LAST_MSG" \
  "$EMIT"

exit 0
