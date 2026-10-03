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
leak() { # leak <detail> <needle that must not survive>
  local out; out=$(emit AGENCY_AGENT=hermes AGENCY_PROJECT=/p AGENCY_TOOL_NAME=Bash AGENCY_DETAIL="$1")
  if printf '%s' "$out" | grep -qF -- "$2"; then echo "FAIL leaked [$2] from [$1] in [$out]"; fail=1; fi
}
leak 'curl -H "Authorization: Bearer abc123xyz" x' abc123xyz
leak 'PGPASSWORD=hunter2 psql' hunter2
leak 'export API_KEY=sk-live-1' sk-live-1
leak 'git clone https://user:pw@host/r' user:pw
leak 'echo ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' ghp_ABCDEFGHIJ
leak 'os.environ["API_KEY"] = "sk-live-2"' sk-live-2
leak "os.environ['TOKEN']='tok-live-3'" tok-live-3
leak 'PASSWORD="hunter two" run' 'two"'
leak '{"password": "hunter three"}' 'three'
leak 'curl -u admin:hunter4 http://x' hunter4
leak 'curl --user admin:hunter5 http://x' hunter5
leak 'mysql -u root -phunter6 db' hunter6

# ordinary commands survive redaction untouched
out=$(emit AGENCY_PROJECT=/p AGENCY_TOOL_NAME=Bash AGENCY_DETAIL="docker run -p 8080:80 nginx")
eq benign "$(jq -r .summary <<<"$out")" "Bash: docker run -p 8080:80 nginx"

# long + multibyte detail: 80 chars max, still valid JSON
long=$(printf 'é%.0s' $(seq 1 200))
out=$(emit AGENCY_PROJECT=/p AGENCY_TOOL_NAME=Bash AGENCY_DETAIL="$long")
eq long-json "$(jq -r '.summary | length' <<<"$out")" 86  # "Bash: " (6) + 80

# last message wins over tool summary, capped at 120
out=$(emit AGENCY_PROJECT=/p AGENCY_EVENT_TYPE=SubagentStop AGENCY_LAST_MSG="done")
eq lastmsg "$(jq -r .summary <<<"$out")" done

[ $fail = 0 ] && echo "agency-emit.check: ok"
exit $fail
