#!/usr/bin/env bash
# Shared emitter: builds one normalized agency-dashboard event from AGENCY_* env
# vars and POSTs it. Tool adapters (Claude, Hermes, Codex...) only translate their
# own hook payload into these vars. MUST NEVER block the caller: always exit 0.
set -u

AGENCY_URL="${AGENCY_URL:-http://localhost:8090/events}"
AGENT="${AGENCY_AGENT:-claude}"
PROJECT="${AGENCY_PROJECT:-}"
SUBAGENT_TYPE="${AGENCY_SUBAGENT_TYPE:-lead}"
EVENT_NAME="${AGENCY_EVENT_TYPE:-}"
TOOL_NAME="${AGENCY_TOOL_NAME:-}"
DETAIL="${AGENCY_DETAIL:-}"
LAST_MSG="${AGENCY_LAST_MSG:-}"

[ -z "$PROJECT" ] && exit 0 # nothing to report without a project path
[ -z "$SUBAGENT_TYPE" ] && SUBAGENT_TYPE="lead"

# Commands can carry secrets: mask bearer tokens, key=value credentials (also quoted
# values with spaces, python os.environ["KEY"] = "..." and json "password": "..."),
# curl -u user:pass / mysql -p<pw>, URL userinfo and long token-looking strings
# before anything leaves the machine. LC_ALL=C keeps the char ranges locale-independent.
if [ "$TOOL_NAME" = "Bash" ]; then
  REDACT=$(cat <<'SED'
s/(bearer|basic) +[^ ]+/\1 ***/Ig
s/((pass(word|wd)?|pwd|token|secret|api[_-]?key|access[_-]?key|auth[a-z_]*)[]"']*[=: ]+)("[^"]*"|'[^']*'|[^ ]+)/\1***/Ig
s/(-u|--user)[ =]+[^ :]+:[^ ]+/\1 ***/g
s/( -p)[^ -][^ ]*/\1***/g
s#://[^/@ ]+@#://***@#g
s/[A-Za-z0-9_+/=-]{32,}/***/g
SED
)
  DETAIL=$(printf '%s' "$DETAIL" | LC_ALL=C sed -E "$REDACT")
fi
DETAIL=$(printf '%s' "$DETAIL" | tr '\n\t' '  ' | tr -s ' ' | sed 's/^ //; s/ $//' | LC_ALL=C.UTF-8 cut -c1-80)

SUMMARY="$TOOL_NAME"
[ -n "$DETAIL" ] && SUMMARY="$TOOL_NAME: $DETAIL"
[ -n "$LAST_MSG" ] && SUMMARY="${LAST_MSG:0:120}"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

PAYLOAD=$(jq -n \
  --arg project "$PROJECT" \
  --arg agent "$AGENT" \
  --arg subagent_type "$SUBAGENT_TYPE" \
  --arg event_type "$EVENT_NAME" \
  --arg tool_name "$TOOL_NAME" \
  --arg summary "$SUMMARY" \
  --arg timestamp "$TIMESTAMP" \
  '{project: $project, agent: $agent, subagent_type: $subagent_type, event_type: $event_type, tool_name: $tool_name, summary: $summary, timestamp: $timestamp}') || exit 0

[ -n "${AGENCY_DRY_RUN:-}" ] && { echo "$PAYLOAD"; exit 0; }

curl -s -m 2 -X POST "$AGENCY_URL" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD" >/dev/null 2>&1

exit 0
