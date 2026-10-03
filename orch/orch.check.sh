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

# ---- Task 2: chain metadata and safe titles ----
fresh
id=$("$ORCH" new backend 'judul: dengan "kutip" & $(touch /tmp/orch-pwn) `x`' </dev/null)
f=$(ls "$ORCH_HOME"/tasks/todo/*.md)
eq root-chain-is-own-id "$(grep -c "^chain: $id\$" "$f")" 1
eq root-no-parent "$(grep -c '^parent: ' "$f")" 0
eq title-literal "$(grep -c '^title: judul: dengan "kutip" & \$(touch /tmp/orch-pwn) `x`$' "$f")" 1
[ ! -e /tmp/orch-pwn ] || { echo "FAIL: title was executed"; fail=1; rm -f /tmp/orch-pwn; }

# ---- Task 3: follow-ups, scribe at the end, guards ----
fresh
root=$("$ORCH" new backend 'api: tambah endpoint' </dev/null)
"$ORCH" claim codex backend >/dev/null
"$ORCH" done "$root" codex 'selesai: $(touch /tmp/orch-pwn2) `x`' >/dev/null 2>&1; eq done-rc "$?" 0
[ ! -e /tmp/orch-pwn2 ] || { echo "FAIL: summary was executed"; fail=1; rm -f /tmp/orch-pwn2; }
eq chain-todo-count "$(count todo)" 2
qa=$(ls "$ORCH_HOME"/tasks/todo/*-qa.md); rv=$(ls "$ORCH_HOME"/tasks/todo/*-reviewer.md)
eq qa-chain "$(grep -c "^chain: $root\$" "$qa")" 1
eq qa-parent "$(grep -c "^parent: $root\$" "$qa")" 1
eq qa-source "$(grep -c '^source_agent: codex$' "$qa")" 1
eq qa-body-summary "$(grep -c 'selesai: \$(touch /tmp/orch-pwn2)' "$qa")" 1
eq done-by "$(grep -c '^done_by: codex$' "$ORCH_HOME"/tasks/done/*-backend.md)" 1
eq no-scribe-yet "$(ls "$ORCH_HOME"/tasks/*/*-scribe.md 2>/dev/null | wc -l | tr -d ' ')" 0

# qa done while reviewer still open: no scribe yet
"$ORCH" claim claude qa >/dev/null; "$ORCH" done "$(basename "$qa" | sed 's/-qa\.md$//')" claude 'lulus' >/dev/null 2>&1
eq no-scribe-while-open "$(ls "$ORCH_HOME"/tasks/*/*-scribe.md 2>/dev/null | wc -l | tr -d ' ')" 0
# last one done: exactly one scribe, lists every task
"$ORCH" claim hermes reviewer >/dev/null; "$ORCH" done "$(basename "$rv" | sed 's/-reviewer\.md$//')" hermes 'bersih' >/dev/null 2>&1
sc=$(ls "$ORCH_HOME"/tasks/todo/*-scribe.md)
eq one-scribe "$(ls "$ORCH_HOME"/tasks/*/*-scribe.md | wc -l | tr -d ' ')" 1
eq scribe-chain "$(grep -c "^chain: $root\$" "$sc")" 1
eq scribe-lists-root "$(grep -c "^- $root \[backend\]" "$sc")" 1
eq scribe-lists-qa "$(grep -c 'lulus' "$sc")" 1
eq scribe-lists-reviewer "$(grep -c 'bersih' "$sc")" 1
# finishing the scribe spawns nothing
"$ORCH" claim claude scribe >/dev/null; "$ORCH" done "$(basename "$sc" | sed 's/-scribe\.md$//')" claude 'dicatat' >/dev/null 2>&1
eq scribe-done-spawns-nothing "$(count todo)" 0

# single analyst task (not in chains.txt): straight to one scribe
fresh
a=$("$ORCH" new analyst 'riset' </dev/null); "$ORCH" claim claude analyst >/dev/null; "$ORCH" done "$a" claude 'temuan' >/dev/null 2>&1
eq analyst-scribe "$(ls "$ORCH_HOME"/tasks/todo/*-scribe.md | wc -l | tr -d ' ')" 1

# done twice / unknown id: fails, creates nothing
n=$(count todo); "$ORCH" done "$a" claude 'lagi' >/dev/null 2>&1; eq done-twice-rc "$?" 1; eq done-twice-nothing "$(count todo)" "$n"
"$ORCH" done 00000000-nope claude x >/dev/null 2>&1; eq done-unknown-rc "$?" 1

# unknown role in chains.txt: warns, other follow-ups still created, done exits 0
fresh; printf 'backend\tnosuchrole,qa\n' > "$ORCH_HOME/chains.txt"
b=$("$ORCH" new backend 'x' </dev/null); "$ORCH" claim codex backend >/dev/null
err=$("$ORCH" done "$b" codex ok 2>&1 >/dev/null); eq badrole-rc "$?" 0
eq badrole-warned "$(printf '%s' "$err" | grep -c "warn: follow-up 'nosuchrole'")" 1
eq badrole-qa-still "$(ls "$ORCH_HOME"/tasks/todo/*-qa.md | wc -l | tr -d ' ')" 1

# chains.txt missing: no configured follow-ups, scribe rule still applies
fresh; rm "$ORCH_HOME/chains.txt"
b=$("$ORCH" new backend 'x' </dev/null); "$ORCH" claim codex backend >/dev/null
"$ORCH" done "$b" codex ok >/dev/null 2>&1; eq nochains-rc "$?" 0
eq nochains-only-scribe "$(ls "$ORCH_HOME"/tasks/todo/ | sed 's/.*-//' | tr '\n' ' ')" "scribe.md "

# old-format task (no chain line): claimable, doable, exactly one scribe
fresh; mkdir -p "$ORCH_HOME/tasks/todo"
printf -- '---\nid: 20200101-000000-1\nrole: analyst\ntitle: lama\ncreated: x\n---\n# lama\n' > "$ORCH_HOME/tasks/todo/20200101-000000-1-analyst.md"
"$ORCH" claim claude analyst >/dev/null; "$ORCH" done 20200101-000000-1 claude 'ok' >/dev/null 2>&1; eq old-rc "$?" 0
eq old-one-scribe "$(ls "$ORCH_HOME"/tasks/todo/*-scribe.md | wc -l | tr -d ' ')" 1

# paths with spaces (the real vault has one)
ORCH_HOME="$(mktemp -d)/Obsidian Vault/Orchestrator"; export ORCH_HOME; mkdir -p "$ORCH_HOME"; DIRS+=("$(dirname "$(dirname "$ORCH_HOME")")")
printf 'backend\tx\nqa\tx\nreviewer\tx\nscribe\tx\n' > "$ORCH_HOME/roles.txt"; cp "$HERE/chains.txt" "$ORCH_HOME/chains.txt"
s=$("$ORCH" new backend 'spasi' </dev/null); "$ORCH" claim codex backend >/dev/null; "$ORCH" done "$s" codex ok >/dev/null 2>&1
eq space-followups "$(count todo)" 2

# ---- Task 4: claim rule ----
fresh
b=$("$ORCH" new backend 'x' </dev/null); "$ORCH" claim codex backend >/dev/null; "$ORCH" done "$b" codex ok >/dev/null 2>&1
"$ORCH" claim codex qa >/dev/null 2>&1; eq builder-no-qa "$?" 1
"$ORCH" claim Codex reviewer >/dev/null 2>&1; eq builder-case-no-reviewer "$?" 1
eq nothing-moved "$(count doing)" 0
"$ORCH" claim claude qa >/dev/null 2>&1; eq other-gets-qa "$?" 0
# claim without a role filter also skips the builder's own review tasks but still takes others
"$ORCH" claim codex >/dev/null 2>&1; eq builder-any-skips-reviewer "$?" 1
"$ORCH" claim hermes >/dev/null 2>&1; eq other-any-gets-reviewer "$?" 0
# non-reviewing roles are unaffected: builder may claim a scribe of its own chain
fresh
a=$("$ORCH" new analyst 'r' </dev/null); "$ORCH" claim claude analyst >/dev/null; "$ORCH" done "$a" claude ok >/dev/null 2>&1
"$ORCH" claim claude scribe >/dev/null 2>&1; eq builder-may-scribe "$?" 0

[ $fail = 0 ] && echo "orch.check: ok"
exit $fail
