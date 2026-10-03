# Multi-Agent Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Codex, agy and Hermes agents show up in the 3D office as their own lead avatars, next to Claude.

**Architecture:** Events get an optional `agent` field. The backend validates it and, for non-Claude tools, prefixes `subagent_type` with the tool name (`codex-lead`), so every existing web lookup that keys on `subagent_type` keeps working and leads never collide. A shared `hooks/agency-emit.sh` holds sanitising and POSTing; each tool gets a thin adapter that only translates its own hook payload.

**Tech Stack:** Go (gin) backend, bash + jq hooks, Next.js/React Three Fiber web (TypeScript).

**Spec:** `docs/superpowers/specs/2026-10-03-multi-agent-visibility-design.md`

## Global Constraints

- Dashboard stays monitor-only: no endpoint or UI that dispatches, approves or stops an agent.
- Hooks MUST NEVER block an agent: every hook script exits 0, fails silently, `curl -m 2`.
- Existing Claude hook (`hooks/agency-notify.sh`) keeps byte-identical output for Claude events; `hooks/agency-notify.check.sh` passes unchanged.
- Event without `agent` means `claude`. Allowed values: `claude`, `codex`, `agy`, `hermes`; anything else gets HTTP 400.
- No raw secrets leave the machine: Bash-like commands go through the emitter's redaction for every tool.
- No `git push`, no merge. Commits are local, with no `Co-Authored-By` or AI attribution (Faris's CLAUDE.md).
- Files outside this repo (`~/.claude/settings.json`, `~/.hermes/config.yaml`, `~/.codex/*`) are only changed after Faris approves the exact change.
- Next.js here is not the stock version; do not touch Next-specific code. This plan only edits plain components and `lib/`.

## Review Focus

- `agent` sent as `" Codex "` (case/whitespace) is accepted as `codex`, not rejected.
- `agent` unknown (`"gemini"`) is rejected with 400 and creates no room or agent.
- Adapter gets empty stdin, invalid JSON, or no `cwd`: exits 0, prints nothing, sends nothing.
- Backend down or slow: adapter returns within about 2 s with exit 0.
- Hermes `terminal` command containing `PGPASSWORD=...` or `Bearer ...`: summary is redacted.
- Tool name the adapter does not know (an MCP tool): summary shows the raw tool name, no crash, no empty event.
- Very long or multibyte command text: truncated to 80 characters without breaking JSON.

---

### Task 1: Backend accepts `agent` and keeps tool leads apart

**Files:**
- Modify: `api/events.go`
- Modify: `api/store.go` (types at the top, `RecordEvent`)
- Test: `api/store_test.go`, `api/main_test.go`
- Modify: `docs/superpowers/specs/2026-10-03-multi-agent-visibility-design.md` (section 1)

**Interfaces:**
- Produces: `EventPayload.Agent string` (`json:"agent"`); `AgentState.Agent` and `Event.Agent` (`json:"agent"`); `func resolveIdentity(agent, subagentType string) (agentName, key string, err error)`.
- Produces (wire contract used by Tasks 2–5): non-claude `subagent_type` becomes `<agent>-<subagent_type>`, e.g. `codex-lead`; claude is unchanged.

- [ ] **Step 1: Write the failing tests**

Append to `api/store_test.go`:

```go
func TestRecordEvent_ToolLeadsDoNotCollide(t *testing.T) {
	store := NewStore()
	project := "/p"
	for _, agent := range []string{"", "codex", "hermes"} {
		_, err := store.RecordEvent(EventPayload{
			Project: project, SubagentType: "lead", Agent: agent,
			EventType: "PreToolUse", ToolName: "Bash", Summary: "Bash: ls",
		})
		if err != nil {
			t.Fatalf("agent %q: %v", agent, err)
		}
	}
	room, _ := store.Snapshot(project)
	for _, key := range []string{"lead", "codex-lead", "hermes-lead"} {
		if _, ok := room.Agents[key]; !ok {
			t.Errorf("expected agent key %q, have %v", key, room.Agents)
		}
	}
	if got := room.Agents["lead"].Agent; got != "claude" {
		t.Errorf("event without agent should be claude, got %q", got)
	}
	if got := room.Agents["codex-lead"].Agent; got != "codex" {
		t.Errorf("codex lead agent = %q", got)
	}
	if len(room.Agents) != 3 {
		t.Errorf("expected 3 agents, got %d", len(room.Agents))
	}
}

func TestRecordEvent_AgentIsCaseAndSpaceInsensitive(t *testing.T) {
	store := NewStore()
	room, err := store.RecordEvent(EventPayload{Project: "/p", SubagentType: "lead", Agent: " Codex "})
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := room.Agents["codex-lead"]; !ok {
		t.Errorf("expected codex-lead, got %v", room.Agents)
	}
}

func TestRecordEvent_UnknownAgentRejected(t *testing.T) {
	store := NewStore()
	_, err := store.RecordEvent(EventPayload{Project: "/p", SubagentType: "lead", Agent: "gemini"})
	if err == nil {
		t.Fatal("expected error for unknown agent")
	}
	if _, ok := store.Snapshot("/p"); ok {
		t.Error("rejected event must not create a room")
	}
}
```

Append to `api/main_test.go` (look at the existing POST `/events` test in that file and reuse its router helper and imports; the body below is the new case):

```go
func TestPostEvents_UnknownAgentIs400(t *testing.T) {
	router := newTestRouter(t)
	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/events", strings.NewReader(`{"project":"/p","subagent_type":"lead","agent":"gemini"}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	if w.Code != 400 {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}
```

If `main_test.go` builds its router differently from `newTestRouter(t)`, copy whatever the neighbouring test uses; do not add a second router builder.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd api && go test ./... 2>&1 | tail -20`
Expected: compile error `unknown field Agent in struct literal of type EventPayload`.

- [ ] **Step 3: Implement**

`api/events.go`:

```go
package main

type EventPayload struct {
	Project      string `json:"project" binding:"required"`
	SubagentType string `json:"subagent_type" binding:"required"`
	Agent        string `json:"agent"`
	EventType    string `json:"event_type"`
	ToolName     string `json:"tool_name"`
	Summary      string `json:"summary"`
	Timestamp    string `json:"timestamp"`
}
```

`api/store.go`: add `"fmt"` and `"strings"` to the imports, add `Agent string \`json:"agent"\`` as the second field of both `Event` and `AgentState`, add this above `RecordEvent`:

```go
var knownAgents = map[string]bool{"claude": true, "codex": true, "agy": true, "hermes": true}

// resolveIdentity validates the tool name and returns it together with the
// room-unique agent key. Claude keeps its bare subagent type (existing hooks
// and the web rely on it); other tools are prefixed so their "lead" never
// collides with Claude's lead in the same project room.
func resolveIdentity(agent, subagentType string) (string, string, error) {
	agent = strings.ToLower(strings.TrimSpace(agent))
	if agent == "" {
		agent = "claude"
	}
	if !knownAgents[agent] {
		return "", "", fmt.Errorf("unknown agent %q", agent)
	}
	if agent == "claude" {
		return agent, subagentType, nil
	}
	return agent, agent + "-" + subagentType, nil
}
```

Replace the body of `RecordEvent` with:

```go
func (s *Store) RecordEvent(payload EventPayload) (*RoomState, error) {
	if payload.Project == "" {
		return nil, errors.New("project field is required")
	}
	if payload.SubagentType == "" {
		return nil, errors.New("subagent_type field is required")
	}
	agentName, key, err := resolveIdentity(payload.Agent, payload.SubagentType)
	if err != nil {
		return nil, err
	}

	ts, err := time.Parse(time.RFC3339, payload.Timestamp)
	if err != nil {
		ts = time.Now()
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	room := s.getOrCreateRoomLocked(payload.Project)
	name := AssignName(room, key)

	agent, ok := room.Agents[key]
	if !ok {
		agent = &AgentState{SubagentType: key, Agent: agentName, DisplayName: name}
		room.Agents[key] = agent
	}
	agent.Status = "working"
	agent.LastAction = payload.Summary
	agent.LastEventAt = ts

	room.Feed = append(room.Feed, Event{
		SubagentType: key,
		Agent:        agentName,
		EventType:    payload.EventType,
		ToolName:     payload.ToolName,
		Summary:      payload.Summary,
		Timestamp:    ts,
	})
	if len(room.Feed) > maxFeedSize {
		room.Feed = room.Feed[len(room.Feed)-maxFeedSize:]
	}

	return cloneRoom(room), nil
}
```

Spec fix: in `docs/superpowers/specs/2026-10-03-multi-agent-visibility-design.md` section "1. Kontrak event dan backend", replace the bullet starting "`store.go`: key agent menjadi" with:

```
- `store.go`: untuk `agent` selain `claude`, `subagent_type` yang disimpan diberi awalan nama tool
  (`codex-lead`, `hermes-lead`). Claude tetap `lead`. Web memakai `subagent_type` sebagai identitas di
  semua tempat, jadi awalan ini menghindari tabrakan tanpa mengubah key map. `agent` dinormalisasi
  (trim + lowercase) sebelum divalidasi.
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd api && go vet ./... && go test ./... 2>&1 | tail -20`
Expected: `ok` for the package, no failures.

- [ ] **Step 5: Commit**

```bash
git add api/events.go api/store.go api/store_test.go api/main_test.go docs/superpowers/specs/2026-10-03-multi-agent-visibility-design.md
git commit -m "feat(api): accept agent field and keep per-tool leads apart"
```

---

### Task 2: Shared emitter and Claude adapter refactor

**Files:**
- Create: `hooks/agency-emit.sh`
- Create: `hooks/agency-emit.check.sh`
- Modify: `hooks/agency-notify.sh`
- Modify: `hooks/agency-notify.check.sh` (add one assertion)

**Interfaces:**
- Produces: `hooks/agency-emit.sh`, driven by env vars (all optional except `AGENCY_PROJECT`): `AGENCY_AGENT` (default `claude`), `AGENCY_PROJECT`, `AGENCY_SUBAGENT_TYPE` (default `lead`), `AGENCY_EVENT_TYPE`, `AGENCY_TOOL_NAME`, `AGENCY_DETAIL`, `AGENCY_LAST_MSG`. Honors `AGENCY_URL`, `AGENCY_DRY_RUN`. Always exits 0.
- Consumes: nothing from Task 1 at runtime; the JSON it emits matches the Task 1 contract (`agent` field).
- Produces: `hooks/agency-notify.sh` honors `AGENCY_AGENT` (default `claude`) so a Claude-compatible tool can reuse it.

- [ ] **Step 1: Write the failing emitter check**

Create `hooks/agency-emit.check.sh` (and `chmod +x`):

```bash
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `chmod +x hooks/agency-emit.check.sh && hooks/agency-emit.check.sh`
Expected: errors such as `agency-emit.sh: No such file or directory` and FAIL lines.

- [ ] **Step 3: Implement the emitter**

Create `hooks/agency-emit.sh` (`chmod +x`):

```bash
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

# Commands can carry secrets: mask key=value credentials, bearer tokens,
# URL userinfo and long token-looking strings before anything leaves the machine.
if [ "$TOOL_NAME" = "Bash" ]; then
  DETAIL=$(printf '%s' "$DETAIL" | sed -E \
    -e 's/(bearer|basic) +[^ ]+/\1 ***/Ig' \
    -e 's/((pass(word|wd)?|pwd|token|secret|api[_-]?key|access[_-]?key|auth[a-z_]*)["'"'"']?[=: ]+)[^ ]+/\1***/Ig' \
    -e 's#://[^/@ ]+@#://***@#g' \
    -e 's/[A-Za-z0-9_+/=-]{32,}/***/g')
fi
DETAIL=$(printf '%s' "$DETAIL" | tr '\n\t' '  ' | tr -s ' ' | sed 's/^ //; s/ $//' | cut -c1-80)

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
```

- [ ] **Step 4: Run emitter check to verify it passes**

Run: `hooks/agency-emit.check.sh`
Expected: `agency-emit.check: ok`

If `long-json` fails because `cut -c` counts bytes under the current locale, run with `LC_ALL=en_US.UTF-8 hooks/agency-emit.check.sh`; if that fixes it, add `export LC_ALL="${LC_ALL:-C.UTF-8}"` right after `set -u` in `agency-emit.sh` and re-run without the override.

- [ ] **Step 5: Refactor the Claude adapter onto the emitter**

Replace `hooks/agency-notify.sh` with:

```bash
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
```

Add one assertion to `hooks/agency-notify.check.sh`, right after the five `expect` lines:

```bash
got=$(AGENCY_DRY_RUN=1 "$HOOK" <<<'{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Read","tool_input":{"file_path":"/a/x.go"}}' | jq -r .agent)
[ "$got" = "claude" ] || { echo "FAIL: agent expected claude got [$got]"; fail=1; }
```

- [ ] **Step 6: Run both checks**

Run: `hooks/agency-notify.check.sh && hooks/agency-emit.check.sh`
Expected: `agency-notify.check: ok` then `agency-emit.check: ok`. The original ten assertions pass unmodified; that is the proof the refactor kept Claude's output identical.

- [ ] **Step 7: Live smoke test (backend up)**

Run, in two shells: `cd api && go run .` and then
`echo '{"hook_event_name":"PreToolUse","cwd":"/tmp/plan-smoke","tool_name":"Bash","tool_input":{"command":"ls"}}' | hooks/agency-notify.sh; curl -s 'localhost:8090/rooms/snapshot?project=/tmp/plan-smoke' | jq '.agents'`
Expected: one agent `lead` with `"agent": "claude"`. Stop the backend afterwards.

- [ ] **Step 8: Commit**

```bash
git add hooks/agency-emit.sh hooks/agency-emit.check.sh hooks/agency-notify.sh hooks/agency-notify.check.sh
git commit -m "refactor(hooks): extract shared emitter, add agent field"
```

---

### Task 3: Hermes adapter

**Files:**
- Create: `hooks/agency-notify-hermes.sh`
- Create: `hooks/agency-notify-hermes.check.sh`
- Create: `hooks/fixtures/hermes-pre_tool_call.json` (captured, see Step 1)

**Interfaces:**
- Consumes: `hooks/agency-emit.sh` env contract from Task 2.
- Produces: an adapter that reads Hermes hook stdin JSON `{hook_event_name, tool_name, tool_input|args, session_id, cwd, extra}` (per `~/.hermes/hermes-agent/agent/shell_hooks.py`) and emits with `AGENCY_AGENT=hermes`, `AGENCY_SUBAGENT_TYPE=lead`.

- [ ] **Step 1: Capture one real Hermes payload**

Hermes registers shell hooks from `~/.hermes/config.yaml` (and asks consent on first use). With Faris's approval of this temporary edit, add under `hooks:` → `pre_tool_call:` a second entry:

```yaml
    - matcher: "terminal|read_file|search_files"
      command: "/bin/sh -c 'cat >> /tmp/hermes-hook-capture.jsonl'"
```

Run one short Hermes session that triggers a `terminal` call and a `read_file` call, approve the hook consent prompt, then:

Run: `head -c 2000 /tmp/hermes-hook-capture.jsonl | jq -c .`
Expected: JSON lines with `hook_event_name`, `tool_name`, `cwd`, and the tool arguments under either `tool_input` or `args`.

Save one `terminal` line and one `read_file` line as `hooks/fixtures/hermes-pre_tool_call.json` (a JSON array of the two objects), remove the temporary `config.yaml` entry, and delete `/tmp/hermes-hook-capture.jsonl`. Note the real argument key names (the adapter below assumes `command` for terminal and `path` for read_file; if they differ, change only the jq paths marked `# payload-shape`).

- [ ] **Step 2: Write the failing check**

Create `hooks/agency-notify-hermes.check.sh` (`chmod +x`). The inline payloads mirror the fixture shape; keep both in sync after Step 1:

```bash
#!/usr/bin/env bash
# Run: hooks/agency-notify-hermes.check.sh — asserts payloads from the Hermes adapter (no network).
set -u
HOOK="$(dirname "$0")/agency-notify-hermes.sh"
fail=0

run() { AGENCY_DRY_RUN=1 "$HOOK" <<<"$1"; }
expect() { # expect <payload> <want "agent|subagent|tool|summary">
  local got; got=$(run "$1" | jq -r '"\(.agent)|\(.subagent_type)|\(.tool_name)|\(.summary)"' 2>/dev/null)
  if [ "$got" != "$2" ]; then echo "FAIL: expected [$2] got [$got]"; fail=1; fi
}

expect '{"hook_event_name":"pre_tool_call","cwd":"/p","tool_name":"terminal","tool_input":{"command":"npm test"}}' 'hermes|lead|Bash|Bash: npm test'
expect '{"hook_event_name":"pre_tool_call","cwd":"/p","tool_name":"read_file","tool_input":{"path":"/a/b/main.go"}}' 'hermes|lead|Read|Read: main.go'
expect '{"hook_event_name":"pre_tool_call","cwd":"/p","tool_name":"search_files","tool_input":{"pattern":"TODO"}}' 'hermes|lead|Grep|Grep: TODO'
expect '{"hook_event_name":"pre_tool_call","cwd":"/p","tool_name":"mcp_postgres_query","tool_input":{"sql":"select 1"}}' 'hermes|lead|mcp_postgres_query|mcp_postgres_query'
expect '{"hook_event_name":"pre_tool_call","cwd":"/p","tool_name":"terminal","args":{"command":"ls"}}' 'hermes|lead|Bash|Bash: ls'
expect '{"hook_event_name":"on_session_end","cwd":"/p"}' 'hermes|lead||Sesi Hermes selesai'

# secrets masked
out=$(run '{"hook_event_name":"pre_tool_call","cwd":"/p","tool_name":"terminal","tool_input":{"command":"PGPASSWORD=hunter2 psql"}}')
printf '%s' "$out" | grep -q hunter2 && { echo "FAIL: leaked secret"; fail=1; }

# junk input: exit 0, no output
for junk in '' 'not json' '{}' '{"hook_event_name":"pre_tool_call"}'; do
  out=$(run "$junk"); rc=$?
  [ "$rc" = 0 ] && [ -z "$out" ] || { echo "FAIL: junk [$junk] rc=$rc out=[$out]"; fail=1; }
done

[ $fail = 0 ] && echo "agency-notify-hermes.check: ok"
exit $fail
```

- [ ] **Step 2b: Run it to verify it fails**

Run: `hooks/agency-notify-hermes.check.sh`
Expected: FAIL lines (`agency-notify-hermes.sh: No such file or directory`).

- [ ] **Step 3: Implement the adapter**

Create `hooks/agency-notify-hermes.sh` (`chmod +x`):

```bash
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
# payload-shape: arguments live in .tool_input or .args depending on the Hermes version.
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

AGENCY_AGENT=hermes \
AGENCY_PROJECT="$PROJECT" \
AGENCY_SUBAGENT_TYPE=lead \
AGENCY_EVENT_TYPE="$EVENT_NAME" \
AGENCY_TOOL_NAME="$TOOL_NAME" \
AGENCY_DETAIL="$DETAIL" \
AGENCY_LAST_MSG="$LAST_MSG" \
  "$EMIT"

exit 0
```

- [ ] **Step 4: Run the check**

Run: `hooks/agency-notify-hermes.check.sh`
Expected: `agency-notify-hermes.check: ok`. Also pipe both captured fixture objects through the adapter with `AGENCY_DRY_RUN=1` and confirm the summaries look right (`jq -c '.[]' hooks/fixtures/hermes-pre_tool_call.json | while read -r l; do AGENCY_DRY_RUN=1 hooks/agency-notify-hermes.sh <<<"$l"; done`).

- [ ] **Step 5: Commit**

```bash
git add hooks/agency-notify-hermes.sh hooks/agency-notify-hermes.check.sh hooks/fixtures/hermes-pre_tool_call.json
git commit -m "feat(hooks): Hermes adapter for agency events"
```

---

### Task 4: Codex adapter

**Files:**
- Create: `hooks/agency-notify-codex.sh`
- Create: `hooks/agency-notify-codex.check.sh`
- Create: `hooks/fixtures/codex-pretooluse.json` (captured)

**Interfaces:**
- Consumes: `hooks/agency-emit.sh` env contract from Task 2.
- Produces: an adapter that emits with `AGENCY_AGENT=codex`, `AGENCY_SUBAGENT_TYPE=lead`.

- [ ] **Step 1: Find where Codex reads hooks and capture one payload**

Codex plugins ship a `hooks.json` shaped like Claude's (`{"hooks":{"PostToolUse":[{"matcher":"...","hooks":[{"type":"command","command":"..."}]}]}}`, example: `~/.codex/.tmp/plugins/plugins/figma/hooks.json`). Confirm the user-level location and trust flow:

Run: `codex --help 2>&1 | grep -i -B1 -A3 hook; ls ~/.codex | grep -i hook`
Read the Codex docs or `codex` help for where a user-level `hooks.json` goes and how a hook becomes trusted. With Faris's approval, register a temporary capture hook through that official path:

```json
{"hooks":{"PreToolUse":[{"matcher":".*","hooks":[{"type":"command","command":"/bin/sh -c 'cat >> /tmp/codex-hook-capture.jsonl'"}]}]}}
```

Run one short `codex exec "list files in the current directory"` in a scratch directory (accept the hook trust prompt through the normal flow; do not use `--dangerously-bypass-hook-trust`).

Run: `head -c 2000 /tmp/codex-hook-capture.jsonl | jq -c .`
Expected: JSON lines with `hook_event_name`, `cwd`, `tool_name` and the tool arguments.

Save one shell-tool line as `hooks/fixtures/codex-pretooluse.json`, remove the temporary hook, delete the capture file. Record the real `tool_name` values (likely `shell` or `Bash`, and `apply_patch`) and the key holding the command (string or argv array).

- [ ] **Step 2: Write the failing check**

Create `hooks/agency-notify-codex.check.sh` (`chmod +x`). Replace the inline `tool_name`/argument shapes with the ones recorded in Step 1 if they differ; the expectations (right-hand side) stay:

```bash
#!/usr/bin/env bash
# Run: hooks/agency-notify-codex.check.sh — asserts payloads from the Codex adapter (no network).
set -u
HOOK="$(dirname "$0")/agency-notify-codex.sh"
fail=0

run() { AGENCY_DRY_RUN=1 "$HOOK" <<<"$1"; }
expect() {
  local got; got=$(run "$1" | jq -r '"\(.agent)|\(.subagent_type)|\(.tool_name)|\(.summary)"' 2>/dev/null)
  if [ "$got" != "$2" ]; then echo "FAIL: expected [$2] got [$got]"; fail=1; fi
}

expect '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"shell","tool_input":{"command":["bash","-lc","npm test"]}}' 'codex|lead|Bash|Bash: npm test'
expect '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"Bash","tool_input":{"command":"ls -la"}}' 'codex|lead|Bash|Bash: ls -la'
expect '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"apply_patch","tool_input":{"input":"*** Update File: src/a.go\n+x"}}' 'codex|lead|Edit|Edit: a.go'
expect '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"mcp__fetch__fetch","tool_input":{"url":"https://x.y/z"}}' 'codex|lead|mcp__fetch__fetch|mcp__fetch__fetch'

out=$(run '{"hook_event_name":"PreToolUse","cwd":"/p","tool_name":"shell","tool_input":{"command":["bash","-lc","PGPASSWORD=hunter2 psql"]}}')
printf '%s' "$out" | grep -q hunter2 && { echo "FAIL: leaked secret"; fail=1; }

for junk in '' 'not json' '{}' '{"hook_event_name":"PreToolUse"}'; do
  out=$(run "$junk"); rc=$?
  [ "$rc" = 0 ] && [ -z "$out" ] || { echo "FAIL: junk [$junk] rc=$rc out=[$out]"; fail=1; }
done

[ $fail = 0 ] && echo "agency-notify-codex.check: ok"
exit $fail
```

- [ ] **Step 2b: Run it to verify it fails**

Run: `hooks/agency-notify-codex.check.sh`
Expected: FAIL lines (adapter missing).

- [ ] **Step 3: Implement the adapter**

Create `hooks/agency-notify-codex.sh` (`chmod +x`). Only the three jq spots marked `# payload-shape` may change after Step 1:

```bash
#!/usr/bin/env bash
# Codex hook adapter: translates a Codex hook payload into AGENCY_* vars for the
# shared emitter. MUST NEVER block Codex: always exit 0, print nothing.
set -u

EMIT="$(dirname "$(readlink -f "$0")")/agency-emit.sh"
INPUT="$(cat)"

PROJECT=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
[ -z "$PROJECT" ] && exit 0

EVENT_NAME=$(echo "$INPUT" | jq -r '.hook_event_name // empty' 2>/dev/null)

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

AGENCY_AGENT=codex \
AGENCY_PROJECT="$PROJECT" \
AGENCY_SUBAGENT_TYPE=lead \
AGENCY_EVENT_TYPE="$EVENT_NAME" \
AGENCY_TOOL_NAME="$TOOL_NAME" \
AGENCY_DETAIL="$DETAIL" \
  "$EMIT"

exit 0
```

- [ ] **Step 4: Run the check and the fixture**

Run: `hooks/agency-notify-codex.check.sh && AGENCY_DRY_RUN=1 hooks/agency-notify-codex.sh < hooks/fixtures/codex-pretooluse.json | jq .`
Expected: `agency-notify-codex.check: ok`, and the fixture produces `agent: codex`, a sensible `tool_name` and `summary`.

- [ ] **Step 5: Commit**

```bash
git add hooks/agency-notify-codex.sh hooks/agency-notify-codex.check.sh hooks/fixtures/codex-pretooluse.json
git commit -m "feat(hooks): Codex adapter for agency events"
```

---

### Task 5: Web shows tool leads with their own label and colour

**Files:**
- Modify: `web/lib/types.ts`
- Modify: `web/components/Office3D/layout.ts`
- Modify: `web/components/Office3D/CharacterModel.tsx` (`ROLE_LOOKS`, around line 51)
- Modify: `web/components/AgentDossierModal.tsx` (`MODEL_INFO`)

**Interfaces:**
- Consumes: wire contract from Task 1: agents arrive keyed `codex-lead`, `agy-lead`, `hermes-lead`, each with `agent: "codex" | "agy" | "hermes"`.
- Produces: `TOOL_LEAD_STYLE` in `layout.ts`; those roles resolve in `ROLE_LABEL`, `ROLE_RING_COLOR`, `ROLE_LOOKS`, `MODEL_INFO`. Not in `DESK_POS_3D`, so `isGuest()` is true and they sit at the existing hot desks (4 slots, round-robin; known limit already marked `ponytail:` in `layout.ts`).

- [ ] **Step 1: Types**

`web/lib/types.ts`: add `agent?: string;` to `AgentState` (after `subagent_type`) and to `FeedEvent` (after `subagent_type`). Optional so existing literals (for example in `app/kerja/page.tsx`) still type-check.

- [ ] **Step 2: Label and colour table**

In `web/components/Office3D/layout.ts`, above `ROLE_LABEL`, add:

```ts
// Leads of non-Claude tools. The backend prefixes their subagent type with the
// tool name, so these keys are what the rest of the web sees.
export const TOOL_LEAD_STYLE: Record<string, { label: string; color: string }> = {
  "codex-lead": { label: "Codex", color: "#10b981" },
  "agy-lead": { label: "agy", color: "#3b82f6" },
  "hermes-lead": { label: "Hermes", color: "#ec4899" },
};
```

Inside `ROLE_LABEL` add as its last entry
`...Object.fromEntries(Object.entries(TOOL_LEAD_STYLE).map(([role, s]) => [role, s.label])),`
and inside `ROLE_RING_COLOR` as its last entry
`...Object.fromEntries(Object.entries(TOOL_LEAD_STYLE).map(([role, s]) => [role, s.color])),`.

- [ ] **Step 3: Look and dossier**

In `CharacterModel.tsx`, import `TOOL_LEAD_STYLE` from `./layout` (extend the existing import on line 8), and add above `ROLE_LOOKS`:

```ts
// Same silhouette as the Claude lead, tinted per tool so leads read apart at a glance.
const toolLeadLook = (shirt: string): PersonLookConfig => ({
  shirt,
  pants: "#111827",
  skin: "#d6a07a",
  hair: "#0c0a09",
  hairStyle: "short",
  headphones: true,
});
```

and as the last entry of `ROLE_LOOKS`:

```ts
  ...Object.fromEntries(Object.entries(TOOL_LEAD_STYLE).map(([role, s]) => [role, toolLeadLook(s.color)])),
```

In `AgentDossierModal.tsx` add to `MODEL_INFO`:

```ts
  "codex-lead": { model: "Codex CLI", desc: "Sesi utama Codex: mengerjakan task dari antrian orch" },
  "agy-lead": { model: "Antigravity (agy)", desc: "Sesi utama agy: mengerjakan task dari antrian orch" },
  "hermes-lead": { model: "Hermes Agent", desc: "Sesi utama Hermes: mengerjakan task dari antrian orch" },
```

- [ ] **Step 4: Type-check and lint**

Run: `cd web && npx tsc --noEmit && npx eslint components lib`
Expected: no errors (warnings that already existed before this task may remain; do not add new ones).

- [ ] **Step 5: Existing activity smoke test still passes**

Run the same way `web/components/Office3D/activity.check.ts` was run when it was written (it is a standalone check; its header comment shows the command). Expected: its output ends in a pass message.

- [ ] **Step 6: Commit**

```bash
git add web/lib/types.ts web/components/Office3D/layout.ts web/components/Office3D/CharacterModel.tsx web/components/AgentDossierModal.tsx
git commit -m "feat(web): label and colour leads of non-Claude tools"
```

---

### Task 6: agy spike

**Files:**
- Modify: `docs/superpowers/specs/2026-10-03-multi-agent-visibility-design.md` (section 3, agy status)
- Create (only if option 1 or 2 works): `hooks/agency-notify-agy.sh`, `hooks/agency-notify-agy.check.sh`

**Interfaces:**
- Consumes: `hooks/agency-emit.sh` from Task 2. Emits `AGENCY_AGENT=agy`.
- Produces: a recorded decision in the spec: agy installed (which route) or deferred (why).

Spike, in this order; stop at the first route that works.

- [ ] **Step 1: Look for a hook point**

Run: `agy --help 2>&1 | grep -i -E "hook|extension|plugin|settings|config"; ls ~/.antigravity ~/.antigravity/extensions | head -30; ls ~/.config/agy ~/.agy 2>/dev/null`
Expected: either a documented hook/config mechanism (then follow Task 4's capture-and-adapter pattern with a new `agency-notify-agy.sh`, check script and fixture) or nothing.

- [ ] **Step 2: Try stream-json as the event source**

With Faris's approval (it makes one small model call), run in a scratch directory:
`agy -p "list the files in this directory" --output-format stream-json 2>/dev/null | head -50 | jq -c .`
Expected: NDJSON where tool calls are identifiable (a tool name and arguments per line). If yes, write `hooks/agency-notify-agy.sh` as a filter: `agy -p ... --output-format stream-json | tee >(while read -r line; do ... emit ...; done)`, with a check script fed by a saved fixture line, following the Task 3 pattern. If the stream only has final text, this route is not worth it.

- [ ] **Step 3: Record the decision**

Edit the spec section "agy, urutan keputusan": replace the three-item list with one line, either `agy: terpasang lewat <route>, adapter hooks/agency-notify-agy.sh` or `agy: ditunda. Alasan: <what Step 1 and 2 showed>. Dibuka lagi kalau agy menambah hook.`

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-10-03-multi-agent-visibility-design.md hooks/
git commit -m "docs: record agy visibility decision"
```

---

### Task 7: Registration helper, end-to-end check, spec sync

**Files:**
- Create: `hooks/install.sh`
- Modify: `docs/superpowers/specs/2026-10-03-multi-agent-visibility-design.md` (section 4)

**Interfaces:**
- Consumes: adapters from Tasks 2–4 (and 6 if built).
- Produces: `hooks/install.sh [--check]`. Read-only: reports whether each tool's hook is registered and prints the exact snippet to add when it is not. It never edits files outside the repo (the spec's idempotent auto-writer is dropped: these configs belong to Faris and mix hand-written entries such as `graphify hook-guard`; a wrong YAML/JSON patch costs more than pasting a snippet).

- [ ] **Step 1: Write the helper**

Create `hooks/install.sh` (`chmod +x`):

```bash
#!/usr/bin/env bash
# Reports which tools have the agency hook registered and prints the snippet for the
# ones that do not. Read-only: this script never edits your config files.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"

report() { # report <label> <file> <needle> <snippet>
  if [ -f "$2" ] && grep -q "$3" "$2"; then echo "ok       $1  ($2)"; else
    echo "MISSING  $1  ($2)"; printf '%s\n' "$4" | sed 's/^/           /'
  fi
}

report "claude" "$HOME/.claude/settings.json" "agency-notify.sh" \
  "add agency-notify.sh to PreToolUse (*), SubagentStart and SubagentStop: command $DIR/agency-notify.sh"

report "hermes" "$HOME/.hermes/config.yaml" "agency-notify-hermes.sh" \
"hooks:
  pre_tool_call:
    - matcher: \"terminal|execute_code|read_file|write_file|patch|search_files\"
      command: \"$DIR/agency-notify-hermes.sh\"
  on_session_end:
    - command: \"$DIR/agency-notify-hermes.sh\""

report "codex" "$HOME/.codex/hooks.json" "agency-notify-codex.sh" \
"{\"hooks\":{\"PreToolUse\":[{\"matcher\":\".*\",\"hooks\":[{\"type\":\"command\",\"command\":\"$DIR/agency-notify-codex.sh\"}]}]}}
(confirm the user-level hooks file location and trust flow found in plan Task 4 Step 1)"
```

Run: `hooks/install.sh`
Expected: one `ok` or `MISSING` line per tool; for the missing ones a snippet with this repo's absolute hook path.

- [ ] **Step 2: Register the hooks (needs Faris's approval of each change)**

Show Faris the snippet for each `MISSING` tool from Step 1 and apply only the ones approved. Re-run `hooks/install.sh` until it prints `ok` for them.

- [ ] **Step 3: End-to-end check**

Start the stack (`cd api && go run .` and `cd web && npm run dev`, or whatever Faris already runs). Then, with the real adapters:

```bash
P=/tmp/plan-e2e
echo '{"hook_event_name":"PreToolUse","cwd":"'$P'","tool_name":"Bash","tool_input":{"command":"ls"}}' | hooks/agency-notify.sh
echo '{"hook_event_name":"pre_tool_call","cwd":"'$P'","tool_name":"terminal","tool_input":{"command":"npm test"}}' | hooks/agency-notify-hermes.sh
echo '{"hook_event_name":"PreToolUse","cwd":"'$P'","tool_name":"shell","tool_input":{"command":["bash","-lc","go test ./..."]}}' | hooks/agency-notify-codex.sh
curl -s "localhost:8090/rooms/snapshot?project=$P" | jq '.agents | to_entries[] | {key, agent: .value.agent, last: .value.last_action}'
```

Expected: three agents `lead` (claude), `hermes-lead` (hermes), `codex-lead` (codex), each with its own last action. Open the 3D office for `/tmp/plan-e2e`: the Claude lead is at its desk on floor 2; the Hermes and Codex leads each sit at a hot desk with their own label and ring colour; clicking one opens a dossier with the tool name.

- [ ] **Step 4: Sync spec section 4 with what was built**

Replace the "4. Instalasi" body in the spec with: `hooks/install.sh` is read-only; it reports registration status and prints the snippet; Faris applies the change to the three config files himself (or approves Claude doing it).

- [ ] **Step 5: Final verification and commit**

Run: `cd api && go vet ./... && go test ./... && cd .. && for c in hooks/*.check.sh; do "$c" || echo "FAILED $c"; done && cd web && npx tsc --noEmit`
Expected: all Go tests pass, every check script prints `ok`, no `FAILED`, `tsc` clean.

```bash
git add hooks/install.sh docs/superpowers/specs/2026-10-03-multi-agent-visibility-design.md
git commit -m "feat(hooks): registration helper and spec sync"
```
