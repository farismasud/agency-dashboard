#!/usr/bin/env bash
# Run: orch/orch.check.sh — tests orch against a temporary ORCH_HOME (never the real vault).
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ORCH="$HERE/orch"
fail=0
DIRS=()
trap 'rm -rf "${DIRS[@]}"' EXIT

eq() { # eq <label> <got> <want>
  [ "$2" = "$3" ] || { echo "FAIL $1: expected [$3] got [$2]"; fail=1; }
}
fresh() { # fresh: new empty ORCH_HOME with roles and the default chains
  ORCH_HOME="$(mktemp -d)"; export ORCH_HOME; DIRS+=("$ORCH_HOME")
  printf 'pm\tx\nanalyst\tx\nbackend\tx\nfrontend\tx\nqa\tx\nreviewer\tx\nappsec\tx\nscribe\tx\ndocs\tx\n' > "$ORCH_HOME/roles.txt"
  cp "$HERE/chains.txt" "$ORCH_HOME/chains.txt"
}
count() { find "$ORCH_HOME/tasks/$1" -name '*.md' 2>/dev/null | wc -l | tr -d ' '; }

# ---- characterization: behaviour that must not change ----
fresh
id=$("$ORCH" new analyst "riset awal" </dev/null)
eq new-id-shape "$(printf '%s' "$id" | grep -cE '^[0-9]{8}-[0-9]{6}-[0-9]+$')" 1
eq new-in-todo "$(count todo)" 1
eq new-role-line "$(grep -c '^role: analyst$' "$ORCH_HOME"/tasks/todo/*.md)" 1
eq new-title-line "$(grep -c '^title: riset awal$' "$ORCH_HOME"/tasks/todo/*.md)" 1
"$ORCH" new nosuchrole x </dev/null 2>/dev/null; eq new-unknown-role-rc "$?" 1
eq ls-todo "$("$ORCH" ls todo | wc -l | tr -d ' ')" 1
eq show-has-title "$("$ORCH" show "$id" | grep -c 'riset awal')" 2   # front-matter + heading

path=$("$ORCH" claim claude analyst)
eq claim-in-doing "$(count doing)" 1
eq claim-path "$path" "$(ls "$ORCH_HOME"/tasks/doing/*.md)"
"$ORCH" claim claude 2>/dev/null; eq claim-empty-rc "$?" 1

"$ORCH" done "$id" claude "selesai ok" >/dev/null 2>&1
eq done-result "$(grep -c '^## Result (claude' "$ORCH_HOME"/tasks/done/*-analyst.md)" 1
eq roles-lists "$("$ORCH" roles | wc -l | tr -d ' ')" 9

[ $fail = 0 ] && echo "orch.check: ok"
exit $fail
