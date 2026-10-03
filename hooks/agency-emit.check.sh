#!/usr/bin/env bash
# Run: hooks/agency-emit.check.sh — asserts payloads built by agency-emit.sh (no network).
set -u
EMIT="$(dirname "$0")/agency-emit.sh"
fail=0

emit() { AGENCY_DRY_RUN=1 env "$@" "$EMIT"; }
eq() { # eq <label> <got> <want>
  if [ "$2" != "$3" ]; then echo "FAIL $1: expected [$3] got [$2]"; fail=1; fi
}

out=$(emit AGENCY_AGENT=codex AGENCY_PROJECT=/p AGENCY_TOOL_NAME=Bash AGENCY_DETAIL="npm test")
eq agent "$(jq -r .agent <<<"$out")" codex
eq lead-default "$(jq -r .subagent_type <<<"$out")" lead
eq summary "$(jq -r .summary <<<"$out")" "Bash: npm test"

out=$(emit AGENCY_PROJECT=/p AGENCY_TOOL_NAME=Read AGENCY_DETAIL=a.go)
eq agent-default "$(jq -r .agent <<<"$out")" claude

# no project: silent, exit 0
out=$(AGENCY_DRY_RUN=1 "$EMIT"); rc=$?
eq noproj-rc "$rc" 0; eq noproj-out "$out" ""

# secrets are masked for Bash, for any agent
for secret in 'Bearer abc123xyz' 'PGPASSWORD=hunter2' 'API_KEY=sk-live-1' 'https://user:pw@host/r' 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; do
  out=$(emit AGENCY_AGENT=hermes AGENCY_PROJECT=/p AGENCY_TOOL_NAME=Bash AGENCY_DETAIL="run $secret now")
  if printf '%s' "$out" | grep -qE 'abc123xyz|hunter2|sk-live-1|user:pw|ghp_ABCDEFGHIJ'; then echo "FAIL leaked [$secret] in [$out]"; fail=1; fi
done

# long + multibyte detail: 80 chars max, still valid JSON
long=$(printf 'é%.0s' $(seq 1 200))
out=$(emit AGENCY_PROJECT=/p AGENCY_TOOL_NAME=Bash AGENCY_DETAIL="$long")
eq long-json "$(jq -r '.summary | length' <<<"$out")" 86  # "Bash: " (6) + 80

# last message wins over tool summary, capped at 120
out=$(emit AGENCY_PROJECT=/p AGENCY_EVENT_TYPE=SubagentStop AGENCY_LAST_MSG="done")
eq lastmsg "$(jq -r .summary <<<"$out")" done

[ $fail = 0 ] && echo "agency-emit.check: ok"
exit $fail
