# Orch Chain Otomatis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `orch done` creates follow-up tasks (qa, reviewer, then one scribe) from an editable config, and `orch claim` stops the agent who built a task from claiming its qa/reviewer/appsec follow-up.

**Architecture:** `orch` stays one bash script. Source moves into the repo (`orch/orch`) with its tests and a default `chains.txt`; `orch/install.sh` copies it to `~/.local/bin/orch` (backup first) so the live tool does not change when git branches switch. Task files gain `chain`/`parent`/`source_agent` front-matter; old files stay valid.

**Tech Stack:** bash, awk, grep, find (no new dependencies).

**Spec:** `docs/superpowers/specs/2026-10-04-orch-chain-design.md`

## Global Constraints

- `orch` never deletes task files: only create, append, move.
- Existing commands and output (`new` prints the id, `ls`, `show`, `roles`, `claim` prints the doing path, `done` appends `## Result`) behave as before for old-format tasks.
- A failure while creating follow-ups never makes `orch done` fail: warn on stderr, exit 0 (task already moved to `done/`).
- `qa`, `reviewer`, `appsec` tasks cannot be claimed by the agent in their `source_agent` (case-insensitive). No override.
- Tests only touch a temporary `ORCH_HOME` (and temporary `ORCH_BIN`), never the real vault or `~/.local/bin`.
- The vault path contains a space (`Obsidian Vault`): every path expansion is quoted; never word-split a path list.
- No `git push`/merge without the finish step; commits carry no `Co-Authored-By` or AI attribution (Faris's CLAUDE.md).
- Files outside the repo (`~/.local/bin/orch`, vault `ROLES.md`, vault `chains.txt`) are written only by `orch/install.sh` and the ROLES.md step in Task 5; if the harness denies a write there, stop and tell Faris to run `! orch/install.sh` himself.

## Review Focus

- Task title or summary with quotes, `$(...)`, backticks, `&`, `/`, or `: ` inside must not execute, break the front-matter, or break field parsing.
- `chains.txt` lists a role that is not in `roles.txt`: warning, follow-ups for the other roles still created, `done` exits 0.
- `chains.txt` missing: no configured follow-ups, scribe rule still works, `done` exits 0.
- Agent names differing only in case (`Claude` vs `claude`) are the same agent for the claim rule.
- A task file from before this change (no `chain`, no `source_agent`) can still be claimed, done, and ends with exactly one scribe.
- `done` run twice on the same task, or on an id that does not exist: the second/unknown call fails without creating anything.
- Paths with spaces (the real vault) work everywhere.

---

### Task 1: Bring `orch` into the repo with characterization tests

**Files:**
- Create: `orch/orch` (verbatim copy of the current `~/.local/bin/orch`)
- Create: `orch/orch.check.sh`

**Interfaces:**
- Produces: `orch/orch.check.sh` helpers used by every later task: `fresh` (new temp `ORCH_HOME` with a roles list and the repo's `chains.txt`, exported), `eq <label> <got> <want>`, `count <todo|doing|done>`, `fail` flag, final `exit $fail`.
- Produces: the baseline script that Tasks 2-4 edit in place.

- [ ] **Step 1: Copy the live script into the repo**

Run: `mkdir -p orch && cp ~/.local/bin/orch orch/orch && chmod +x orch/orch && cmp orch/orch ~/.local/bin/orch && echo same`
Expected: `same`

- [ ] **Step 2: Write the default config and the characterization tests**

Create `orch/chains.txt` (tab-separated; this is the default from the spec):

```
frontend	qa,reviewer
backend	qa,reviewer
odoo	qa,reviewer
data	qa,reviewer
uiux	qa,reviewer
devops	qa,reviewer
infra	qa,reviewer
```

Create `orch/orch.check.sh` (and `chmod +x`):

```bash
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
eq done-moved "$(count done)" "$(count done)"   # placeholder replaced in Task 3 (scribe appears)
eq done-result "$(grep -c '^## Result (claude' "$ORCH_HOME"/tasks/done/*-analyst.md)" 1
eq roles-lists "$("$ORCH" roles | wc -l | tr -d ' ')" 9

[ $fail = 0 ] && echo "orch.check: ok"
exit $fail
```

Note: `done-moved` is deliberately a no-op placeholder here; Task 3 replaces it with the real count once done can create a scribe. Remove the line in Task 3 Step 1.

- [ ] **Step 3: Run it against the baseline**

Run: `orch/orch.check.sh`
Expected: `orch.check: ok` (these tests describe existing behaviour, so they pass on the untouched script; this is the safety net for the refactor).

- [ ] **Step 4: Commit**

```bash
git add orch/
git commit -m "feat(orch): bring orch into the repo with characterization tests"
```

---

### Task 2: `mk_task` helper and chain metadata on new tasks

**Files:**
- Modify: `orch/orch` (`new` case, helpers at the top)
- Modify: `orch/orch.check.sh`

**Interfaces:**
- Produces in `orch/orch`: `field <file> <key>` (first front-matter value, empty if absent); `mk_task <role> <title> <chain|""> <parent|""> <source_agent|"">` (body on stdin, prints the new id, returns 1 with a stderr message on unknown role); `new` tasks now carry `chain: <own id>`.
- Consumes: nothing from earlier tasks except the tests' helpers.

- [ ] **Step 1: Write the failing tests**

Insert before the final `[ $fail = 0 ]` line of `orch/orch.check.sh`:

```bash
# ---- Task 2: chain metadata and safe titles ----
fresh
id=$("$ORCH" new backend 'judul: dengan "kutip" & $(touch /tmp/orch-pwn) `x`' </dev/null)
f=$(ls "$ORCH_HOME"/tasks/todo/*.md)
eq root-chain-is-own-id "$(grep -c "^chain: $id\$" "$f")" 1
eq root-no-parent "$(grep -c '^parent: ' "$f")" 0
eq title-literal "$(grep -c '^title: judul: dengan "kutip" & \$(touch /tmp/orch-pwn) `x`$' "$f")" 1
[ ! -e /tmp/orch-pwn ] || { echo "FAIL: title was executed"; fail=1; rm -f /tmp/orch-pwn; }
```

- [ ] **Step 2: Run to verify it fails**

Run: `orch/orch.check.sh`
Expected: `FAIL root-chain-is-own-id: expected [1] got [0]`

- [ ] **Step 3: Implement**

In `orch/orch`, add `SELF_CHECKED="qa reviewer appsec"` after the `T=...` line, and add these helpers after `find_task`:

```bash
# field <file> <key>: first front-matter value ("" if absent). Titles may contain ": ".
field() {
  awk -v k="$2" '
    NR == 1 && $0 != "---" { exit }
    $0 == "---" { n++; if (n == 2) exit; next }
    n == 1 && index($0, k ": ") == 1 { print substr($0, length(k) + 3); exit }' "$1"
}
# mk_task <role> <title> <chain|""> <parent|""> <source_agent|"">; body on stdin; prints the id.
mk_task() {
  local role="$1" title="$2" chain="$3" parent="$4" src="$5" id f
  grep -q "^$role	" "$Q/roles.txt" || { echo "unknown role '$role' (orch roles)" >&2; return 1; }
  id="$(date +%Y%m%d-%H%M%S)-$RANDOM"
  f="$T/todo/$id-$role.md"
  {
    printf -- '---\nid: %s\nrole: %s\ntitle: %s\ncreated: %s\nchain: %s\n' "$id" "$role" "$title" "$(date -Is)" "${chain:-$id}"
    if [ -n "$parent" ]; then printf 'parent: %s\n' "$parent"; fi
    if [ -n "$src" ]; then printf 'source_agent: %s\n' "$src"; fi
    printf -- '---\n# %s\n' "$title"
    cat
  } > "$f"
  note "NEW $id [$role] $title"; echo "$id"
}
```

Replace the whole `new)` case with:

```bash
  new)   # orch new <role> <title...>   (body from stdin if piped)
    role="$2"; shift 2; title="$*"
    if [ -t 0 ]; then mk_task "$role" "$title" "" "" "" </dev/null; else mk_task "$role" "$title" "" "" ""; fi ;;
```

- [ ] **Step 4: Run to verify it passes**

Run: `orch/orch.check.sh`
Expected: `orch.check: ok` (characterization tests still pass, so the refactor kept old behaviour).

- [ ] **Step 5: Commit**

```bash
git add orch/orch orch/orch.check.sh
git commit -m "feat(orch): mk_task helper, chain metadata on new tasks"
```

---

### Task 3: `orch done` creates follow-ups and one scribe at the end

**Files:**
- Modify: `orch/orch` (`done` case, new `chain_files` and `chain_followups` functions)
- Modify: `orch/orch.check.sh`

**Interfaces:**
- Consumes from Task 2: `field`, `mk_task`, `SELF_CHECKED`, `note`.
- Produces: `chain_files <chain> <file...>` (prints paths of the given files whose front-matter has `chain: <chain>`, nothing if none); `chain_followups <parent_id> <role> <title> <chain> <agent> <summary>`; `done` refuses a task already in `done/` (exit 1) and appends `done_by: <agent>`.

- [ ] **Step 1: Write the failing tests**

In `orch/orch.check.sh`, delete the placeholder line `eq done-moved ... # placeholder ...`. Insert before the final `[ $fail = 0 ]` line:

```bash
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
eq scribe-lists-root "$(grep -c "$root" "$sc")" 1
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
eq badrole-warned "$(printf '%s' "$err" | grep -c 'nosuchrole')" 1
eq badrole-qa-still "$(ls "$ORCH_HOME"/tasks/todo/*-qa.md | wc -l | tr -d ' ')" 1

# chains.txt missing: no configured follow-ups, scribe rule still applies
fresh; rm "$ORCH_HOME/chains.txt"
b=$("$ORCH" new backend 'x' </dev/null); "$ORCH" claim codex backend >/dev/null
"$ORCH" done "$b" codex ok >/dev/null 2>&1; eq nochains-rc "$?" 0
eq nochains-only-scribe "$(ls "$ORCH_HOME"/tasks/todo/ | sed 's/.*-//' | tr '\n' ' ')" "scribe.md "

# old-format task (no chain line): claimable, doable, exactly one scribe
fresh
printf -- '---\nid: 20200101-000000-1\nrole: analyst\ntitle: lama\ncreated: x\n---\n# lama\n' > "$ORCH_HOME/tasks/todo/20200101-000000-1-analyst.md"
"$ORCH" claim claude analyst >/dev/null; "$ORCH" done 20200101-000000-1 claude 'ok' >/dev/null 2>&1; eq old-rc "$?" 0
eq old-one-scribe "$(ls "$ORCH_HOME"/tasks/todo/*-scribe.md | wc -l | tr -d ' ')" 1

# paths with spaces (the real vault has one)
ORCH_HOME="$(mktemp -d)/Obsidian Vault/Orchestrator"; export ORCH_HOME; mkdir -p "$ORCH_HOME"; DIRS+=("$(dirname "$(dirname "$ORCH_HOME")")")
printf 'backend\tx\nqa\tx\nreviewer\tx\nscribe\tx\n' > "$ORCH_HOME/roles.txt"; cp "$HERE/chains.txt" "$ORCH_HOME/chains.txt"
s=$("$ORCH" new backend 'spasi' </dev/null); "$ORCH" claim codex backend >/dev/null; "$ORCH" done "$s" codex ok >/dev/null 2>&1
eq space-followups "$(count todo)" 2
```

- [ ] **Step 2: Run to verify it fails**

Run: `orch/orch.check.sh`
Expected: `FAIL chain-todo-count: expected [2] got [0]` (plus the later cases).

- [ ] **Step 3: Implement**

Add these functions to `orch/orch` after `mk_task`:

```bash
# chain_files <chain> <file...>: those files whose front-matter has "chain: <chain>" (none if no match).
chain_files() { local c="$1"; shift; grep -lsxF "chain: $c" "$@" 2>/dev/null || true; }

# chain_followups <parent_id> <role> <title> <chain> <agent> <summary>
# Creates the follow-ups configured in chains.txt, then ONE scribe when the chain has nothing open.
# Never fails the caller: problems are warnings.
chain_followups() {
  local pid="$1" role="$2" title="$3" chain="$4" agent="$5" summary="$6" want r cid g
  if [ -f "$Q/chains.txt" ]; then
    want="$(awk -F'\t' -v r="$role" '$1 == r { print $2; exit }' "$Q/chains.txt")"
    for r in ${want//,/ }; do
      if cid="$(printf 'Follow-up dari %s (%s), dikerjakan %s.\n\nHasil: %s\n\nDetail: `orch show %s`\n' "$pid" "$title" "$agent" "$summary" "$pid" \
          | mk_task "$r" "$r: $title" "$chain" "$pid" "$agent")"; then
        note "CHAIN $cid after $pid"
      else
        echo "warn: follow-up '$r' dilewati" >&2
      fi
    done
  fi
  # ponytail: scribe is a fixed rule, not config; move to chains.txt if a second end-of-chain role appears.
  [ "$role" = scribe ] && return 0
  [ -z "$(chain_files "$chain" "$T"/todo/*.md "$T"/doing/*.md)" ] || return 0
  [ -z "$(chain_files "$chain" "$T"/todo/*-scribe.md "$T"/doing/*-scribe.md "$T"/done/*-scribe.md)" ] || return 0
  if cid="$({
        printf 'Rantai %s selesai. Catat hasilnya ke vault (Knowledge/) dan tautkan catatan terkait.\n\nTask dalam rantai:\n' "$chain"
        printf -- '- %s [%s] %s: %s\n' "$pid" "$role" "$title" "$summary"
        while IFS= read -r g; do
          [ "$(field "$g" id)" = "$pid" ] && continue
          printf -- '- %s [%s] %s: %s\n' "$(field "$g" id)" "$(field "$g" role)" "$(field "$g" title)" "$(awk '/^## Result/ { getline; print; exit }' "$g")"
        done < <(chain_files "$chain" "$T"/done/*.md)
      } | mk_task scribe "scribe: $title" "$chain" "$pid" "$agent")"; then
    note "CHAIN $cid after $pid"
  else
    echo "warn: scribe dilewati" >&2
  fi
}
```

Replace the whole `done)` case with:

```bash
  done)  # orch done <id> <agent> <summary...>
    id="$2"; agent="$3"; shift 3; summary="$*"; f="$(find_task "$id")"
    [ -n "$f" ] || { echo "not found" >&2; exit 1; }
    case "$f" in "$T"/done/*) echo "sudah selesai: $id" >&2; exit 1 ;; esac
    tid="$(field "$f" id)"; role="$(field "$f" role)"; title="$(field "$f" title)"
    chain="$(field "$f" chain)"; chain="${chain:-$tid}"
    printf '\n## Result (%s, %s)\n%s\n\ndone_by: %s\n' "$agent" "$(date -Is)" "$summary" "$agent" >> "$f"
    mv "$f" "$T/done/"; note "DONE $id by $agent: $summary"
    chain_followups "$tid" "$role" "$title" "$chain" "$agent" "$summary" || echo "warn: chain follow-up error" >&2 ;;
```

- [ ] **Step 4: Run to verify it passes**

Run: `orch/orch.check.sh`
Expected: `orch.check: ok`. If `scribe-lists-qa`/`scribe-lists-reviewer` fail, check that the done files contain `## Result` followed directly by the summary line (the awk reads the line after the header).

- [ ] **Step 5: Commit**

```bash
git add orch/orch orch/orch.check.sh
git commit -m "feat(orch): done creates follow-ups and one scribe per chain"
```

---

### Task 4: `orch claim` enforces "not the builder" for qa/reviewer/appsec

**Files:**
- Modify: `orch/orch` (`claim` case)
- Modify: `orch/orch.check.sh`

**Interfaces:**
- Consumes: `field`, `SELF_CHECKED` from Task 2; tasks with `source_agent` from Task 3.
- Produces: `claim` skips a `qa`/`reviewer`/`appsec` task whose `source_agent` equals the claimer (case-insensitive); all other behaviour unchanged.

- [ ] **Step 1: Write the failing tests**

Insert before the final `[ $fail = 0 ]` line of `orch/orch.check.sh`:

```bash
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `orch/orch.check.sh`
Expected: `FAIL builder-no-qa: expected [1] got [0]`

- [ ] **Step 3: Implement**

Replace the whole `claim)` case in `orch/orch` with:

```bash
  claim) # orch claim <agent> [role]  -> oldest matching todo (never the builder's own qa/reviewer/appsec)
    agent="$2"; pat="*${3:+-$3}.md"; me="$(printf '%s' "$agent" | tr '[:upper:]' '[:lower:]')"
    while IFS= read -r f; do
      r="$(field "$f" role)"; src="$(field "$f" source_agent | tr '[:upper:]' '[:lower:]')"
      if [[ " $SELF_CHECKED " == *" $r "* && -n "$src" && "$src" == "$me" ]]; then continue; fi
      d="$T/doing/$(basename "$f")"
      if mv "$f" "$d" 2>/dev/null; then
        printf '\nclaimed_by: %s at %s\n' "$agent" "$(date -Is)" >> "$d"
        note "CLAIM $(basename "$f") by $agent"; echo "$d"; exit 0
      fi
    done < <(find "$T/todo" -name "$pat" | sort); echo "no task" >&2; exit 1 ;;
```

- [ ] **Step 4: Run to verify it passes**

Run: `orch/orch.check.sh`
Expected: `orch.check: ok`

- [ ] **Step 5: Commit**

```bash
git add orch/orch orch/orch.check.sh
git commit -m "feat(orch): claim skips the builder's own qa/reviewer/appsec"
```

---

### Task 5: Installer, live install, ROLES.md, final verification

**Files:**
- Create: `orch/install.sh`
- Modify: `orch/orch.check.sh` (installer tests)
- Modify (outside repo, by installer / one edit): `~/.local/bin/orch`, vault `Orchestrator/chains.txt`, vault `Orchestrator/ROLES.md`

**Interfaces:**
- Consumes: `orch/orch`, `orch/chains.txt`.
- Produces: `orch/install.sh [--check]`; env overrides `ORCH_BIN` (destination, default `~/.local/bin/orch`) and `ORCH_HOME` (vault dir, default the real vault).

- [ ] **Step 1: Write the failing installer tests**

Insert before the final `[ $fail = 0 ]` line of `orch/orch.check.sh`:

```bash
# ---- Task 5: installer (temporary destinations only) ----
INSTALL="$HERE/install.sh"
tmp="$(mktemp -d)"; DIRS+=("$tmp")
export ORCH_BIN="$tmp/bin/orch"; export ORCH_HOME="$tmp/vault"; mkdir -p "$tmp/bin" "$tmp/vault"
printf '#!/bin/sh\necho old\n' > "$ORCH_BIN"; chmod +x "$ORCH_BIN"
"$INSTALL" --check >/dev/null 2>&1; eq check-differs-rc "$?" 1
before=$(cat "$ORCH_BIN")
eq check-wrote-nothing "$before" "$(printf '#!/bin/sh\necho old')"
"$INSTALL" >/dev/null 2>&1; eq install-rc "$?" 0
cmp -s "$HERE/orch" "$ORCH_BIN"; eq installed-same "$?" 0
eq backup-made "$(ls "$tmp/bin" | grep -c '^orch\.bak-')" 1
eq backup-is-old "$(cat "$tmp"/bin/orch.bak-* )" "$(printf '#!/bin/sh\necho old')"
eq chains-copied "$(cmp -s "$HERE/chains.txt" "$tmp/vault/chains.txt"; echo $?)" 0
"$INSTALL" --check >/dev/null 2>&1; eq check-same-rc "$?" 0
# an edited vault chains.txt is never overwritten; reinstall of identical script makes no new backup
printf 'backend\tqa\n' > "$tmp/vault/chains.txt"; "$INSTALL" >/dev/null 2>&1
eq chains-kept "$(cat "$tmp/vault/chains.txt")" "$(printf 'backend\tqa')"
eq no-extra-backup "$(ls "$tmp/bin" | grep -c '^orch\.bak-')" 1
unset ORCH_BIN
```

- [ ] **Step 2: Run to verify it fails**

Run: `orch/orch.check.sh`
Expected: `install.sh: No such file or directory` and `FAIL check-differs-rc`.

- [ ] **Step 3: Implement the installer**

Create `orch/install.sh` (`chmod +x`):

```bash
#!/usr/bin/env bash
# Installs orch from this repo to ~/.local/bin/orch (backup first) and seeds the vault chains.txt.
#   orch/install.sh          install
#   orch/install.sh --check  report whether the live copy matches the repo source (writes nothing)
set -eu
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="${ORCH_BIN:-$HOME/.local/bin/orch}"
VAULT="${ORCH_HOME:-$HOME/Documents/Obsidian Vault/Orchestrator}"

if [ "${1:-}" = "--check" ]; then
  if cmp -s "$SRC/orch" "$DEST"; then echo "ok       orch ($DEST)"; else echo "BEDA     orch: jalankan orch/install.sh"; exit 1; fi
  exit 0
fi

mkdir -p "$(dirname "$DEST")" "$VAULT"
if [ -f "$DEST" ] && ! cmp -s "$SRC/orch" "$DEST"; then
  cp -p "$DEST" "$DEST.bak-$(date +%Y%m%d-%H%M%S)"
fi
install -m 755 "$SRC/orch" "$DEST"
# never overwrite a chains.txt Faris may have edited
[ -f "$VAULT/chains.txt" ] || cp "$SRC/chains.txt" "$VAULT/chains.txt"
echo "installed $DEST (vault config: $VAULT/chains.txt)"
```

- [ ] **Step 4: Run to verify it passes**

Run: `orch/orch.check.sh`
Expected: `orch.check: ok`

- [ ] **Step 5: Commit**

```bash
git add orch/install.sh orch/orch.check.sh
git commit -m "feat(orch): installer with backup and --check"
```

- [ ] **Step 6: Live install and smoke test (touches files outside the repo)**

Run: `orch/install.sh && orch/install.sh --check`
Expected: `installed /home/faris/.local/bin/orch ...` then `ok       orch (...)`. A backup `orch.bak-<timestamp>` sits next to it. The real vault gains `Orchestrator/chains.txt` if absent.

Smoke the installed binary in a scratch vault (never the real one):

```bash
t=$(mktemp -d); cp "$HOME/Documents/Obsidian Vault/Orchestrator/roles.txt" "$t/"; cp orch/chains.txt "$t/"
ORCH_HOME="$t" orch new backend "smoke" </dev/null && ORCH_HOME="$t" orch claim claude backend && ORCH_HOME="$t" orch ls todo; rm -rf "$t"
```
Expected: an id, a `.../doing/...-backend.md` path, and an empty `ls todo`.

If a write is denied by the harness, stop and tell Faris: `! orch/install.sh`.

- [ ] **Step 7: ROLES.md section**

Append to `~/Documents/Obsidian Vault/Orchestrator/ROLES.md`, before the `## Aturan` heading's bullet list ends (simply append at the end of the file):

```markdown

## Rantai otomatis
- `orch done` otomatis membuat task lanjutan menurut `Orchestrator/chains.txt` (default: frontend/backend/odoo/data/uiux/devops/infra → `qa` + `reviewer`).
- Satu task `scribe` dibuat sekali di akhir rantai, setelah tidak ada task terbuka lagi di rantai itu.
- `orch claim` tidak memberi task `qa`/`reviewer`/`appsec` kepada agent yang mengerjakan task induknya.
- Ubah aturan rantai dengan mengedit `chains.txt` (satu baris `role<TAB>follow-up,follow-up`), bukan `orch`.
- Kode `orch` ada di repo agency-dashboard (`orch/`); pasang perubahan dengan `orch/install.sh`.
```

- [ ] **Step 8: Final verification**

Run: `orch/orch.check.sh && orch/install.sh --check && hooks/install.check.sh && (cd server && go test ./... 2>&1 | tail -1)`
Expected: `orch.check: ok`, `ok       orch (...)`, `install.check: ok`, `ok  agency-dashboard/server`.
