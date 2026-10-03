#!/usr/bin/env bash
# Hermes hook adapter: translates a Hermes shell-hook payload
# {hook_event_name, tool_name, tool_input|args, cwd} into AGENCY_* vars for the
# shared emitter. MUST NEVER block Hermes: always exit 0, print nothing.
set -u

EMIT="$(dirname "$(readlink -f "$0")")/agency-emit.sh"
INPUT="$(cat)"

PROJECT=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
[ -z "$PROJECT" ] && exit 0

EVENT_NAME=$(echo "$INPUT" | jq -r '.hook_event_name // empty' 2>/dev/null)

# Map Hermes tool names onto the names the web already understands.
# payload-shape: arguments live in .tool_input (Hermes shell_hooks.py), .args as a fallback.
MAPPED=$(echo "$INPUT" | jq -r '
  (.tool_input // .args // {}) as $i
  | (.tool_name // "") as $t
  | if   ($t == "terminal" or $t == "execute_code") then "Bash\t" + ($i.command // $i.code // "")
    elif ($t == "read_file" or $t == "write_file" or $t == "patch") then (if $t == "read_file" then "Read" else "Edit" end) + "\t" + (($i.path // $i.file_path // "") | split("/") | last)
    elif ($t == "search_files") then "Grep\t" + ($i.pattern // $i.query // "")
    else $t + "\t" end' 2>/dev/null)

TOOL_NAME="${MAPPED%%$'\t'*}"
DETAIL="${MAPPED#*$'\t'}"
LAST_MSG=""
[ "$EVENT_NAME" = "on_session_end" ] && LAST_MSG="Sesi Hermes selesai"
[ -z "$TOOL_NAME" ] && [ -z "$LAST_MSG" ] && exit 0 # tool-less event with nothing to say: skip, no empty bubble

AGENCY_AGENT=hermes \
AGENCY_PROJECT="$PROJECT" \
AGENCY_SUBAGENT_TYPE=lead \
AGENCY_EVENT_TYPE="$EVENT_NAME" \
AGENCY_TOOL_NAME="$TOOL_NAME" \
AGENCY_DETAIL="$DETAIL" \
AGENCY_LAST_MSG="$LAST_MSG" \
  "$EMIT"

exit 0
