# Agency Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Live isometric "kantor" dashboard yang nampilin aktivitas real Claude Code sub-agent (pm/analyst/dev/qa) via hook events, websocket, dan roadmap parsed dari `ROADMAP.md`.

**Architecture:** Go/Gin backend (`api/`) menerima event POST dari hook global, simpan state in-memory per project ("room"), broadcast lewat websocket. Next.js frontend (`web/`) render isometric office, live feed, roadmap panel. Bash hook script kirim event dari Claude Code ke backend.

**Tech Stack:** Go 1.22+, Gin, gorilla/websocket, fsnotify. Next.js 14+ (App Router), TypeScript, native WebSocket API. Bash + `jq` untuk hook script.

**Spec:** `docs/superpowers/specs/2026-09-25-agency-dashboard-design.md`

## Global Constraints

- Hook script **tidak boleh pernah block/gagalin Claude Code** — semua error di hook harus exit 0, gagal diam-diam.
- Backend port default `8090`, frontend port default `3090` (hindari bentrok 8080/3000 punya `obsidian-dashboard`).
- State backend **in-memory only** — no DB, restart = reset. Ini sesuai spec, jangan tambah persistence yang gak diminta.
- Event payload field names dari hook: `project`, `subagent_type`, `event_type`, `tool_name`, `summary`, `timestamp` (snake_case, persis sesuai spec) — dipakai apa adanya di backend, tanpa mapping camelCase.
- Idle threshold: 45 detik tanpa event baru → status `idle`. Ticker cek tiap 15 detik.
- Feed per room dibatasi 200 event terbaru (buang yang lama, jangan biarin memory tumbuh gak terbatas).
- Jangan modifikasi `~/.claude/settings.json` tanpa nunjukin diff dan konfirmasi eksplisit ke user dulu (file itu punya config lain: ccstatusline, dll — lihat Task 9).

## Review Focus

- **Backend restart saat frontend masih connect** — websocket harus reconnect otomatis, bukan silent-dead UI. (Test di Task 5.)
- **Project path yang punya karakter aneh (spasi, unicode)** di `project` field — query param harus di-encode/decode benar, gak boleh 400 atau salah room. (Test di Task 3 & 8.)
- **`ROADMAP.md` dengan format gak sesuai konvensi** (kosong, cuma judul tanpa progress, atau progress >100/negatif) — parser harus gagal aman (return nil/error), bukan crash backend. (Test di Task 4.)
- **Dua subagent_type sama connect ke room yang sama nyaris bersamaan** (race) — assignment nama & update `AgentState` harus thread-safe, gak boleh data race atau nama dobel. (Test di Task 2 untuk `AssignName`, Task 3 untuk `Store.RecordEvent` concurrent dengan `-race`.)
- **Event dengan field kosong/hilang** (`summary` kosong, `timestamp` invalid) dari hook — backend log & skip field yang gak valid, bukan reject seluruh event kalau field non-esensial hilang. (Test di Task 3.)

---

## File Structure

```
agency-dashboard/
├── api/
│   ├── go.mod
│   ├── main.go              # wiring, HTTP server, routes
│   ├── store.go             # RoomState, AgentState, thread-safe Store
│   ├── store_test.go
│   ├── names.go             # random display-name assignment
│   ├── names_test.go
│   ├── events.go            # POST /events handler + EventPayload
│   ├── events_test.go
│   ├── roadmap.go           # ROADMAP.md parser (pure function)
│   ├── roadmap_test.go
│   ├── watcher.go           # fsnotify wiring per active room
│   ├── idle.go              # idle-sweep ticker
│   ├── idle_test.go
│   ├── ws.go                # websocket hub + GET /ws
│   └── rooms.go             # GET /rooms, GET /rooms/snapshot
├── web/
│   ├── (Next.js app, scaffolded Task 8)
│   ├── app/kerja/page.tsx
│   ├── lib/types.ts
│   ├── lib/useAgencySocket.ts
│   ├── components/RoomSelector.tsx
│   ├── components/Office.tsx
│   ├── components/Feed.tsx
│   └── components/Roadmap.tsx
├── hooks/
│   └── agency-notify.sh
└── docs/
    ├── superpowers/specs/2026-09-25-agency-dashboard-design.md
    └── superpowers/plans/2026-09-25-agency-dashboard.md
```

---

### Task 1: Go module + Store core (RoomState/AgentState, idle calc)

**Files:**
- Create: `api/go.mod`
- Create: `api/store.go`
- Create: `api/store_test.go`

**Interfaces:**
- Produces: `type AgentState struct { SubagentType, DisplayName, Status, LastAction string; LastEventAt time.Time }`, `type RoomState struct { Project string; Agents map[string]*AgentState; Feed []Event; Roadmap *RoadmapData }`, `type Store struct{ ... }` with methods `NewStore() *Store`, `(*Store) GetOrCreateRoom(project string) *RoomState`, `(*Store) Snapshot(project string) (*RoomState, bool)`, `(*Store) ListProjects() []string`, `IsIdle(lastEventAt, now time.Time, threshold time.Duration) bool`.
- Consumes: nothing (first task).

- [ ] **Step 1: Init Go module**

```bash
cd /home/faris/Faris/Kerja/agency-dashboard
mkdir -p api
cd api
go mod init agency-dashboard/api
go get github.com/gin-gonic/gin@latest
go get github.com/gorilla/websocket@latest
go get github.com/fsnotify/fsnotify@latest
```

- [ ] **Step 2: Write failing test for `IsIdle`**

Create `api/store_test.go`:

```go
package main

import (
	"testing"
	"time"
)

func TestIsIdle(t *testing.T) {
	now := time.Date(2026, 9, 25, 12, 0, 0, 0, time.UTC)
	threshold := 45 * time.Second

	cases := []struct {
		name        string
		lastEventAt time.Time
		want        bool
	}{
		{"just happened", now.Add(-1 * time.Second), false},
		{"exactly at threshold", now.Add(-45 * time.Second), true},
		{"long idle", now.Add(-5 * time.Minute), true},
		{"future timestamp (clock skew)", now.Add(10 * time.Second), false},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := IsIdle(c.lastEventAt, now, threshold)
			if got != c.want {
				t.Errorf("IsIdle(%v, %v, %v) = %v, want %v", c.lastEventAt, now, threshold, got, c.want)
			}
		})
	}
}
```

- [ ] **Step 2b: Run test, verify it fails**

Run: `cd api && go test ./... -run TestIsIdle -v`
Expected: FAIL — `IsIdle` undefined (compile error).

- [ ] **Step 3: Implement `store.go`**

```go
package main

import (
	"sync"
	"time"
)

type Event struct {
	SubagentType string    `json:"subagent_type"`
	EventType    string    `json:"event_type"`
	ToolName     string    `json:"tool_name"`
	Summary      string    `json:"summary"`
	Timestamp    time.Time `json:"timestamp"`
}

type AgentState struct {
	SubagentType string    `json:"subagent_type"`
	DisplayName  string    `json:"display_name"`
	Status       string    `json:"status"` // "working" | "idle"
	LastAction   string    `json:"last_action"`
	LastEventAt  time.Time `json:"last_event_at"`
}

type RoadmapData struct {
	Modules []RoadmapModule `json:"modules"`
}

type RoadmapModule struct {
	Title    string `json:"title"`
	Progress int    `json:"progress"`
}

type RoomState struct {
	Project string                 `json:"project"`
	Agents  map[string]*AgentState `json:"agents"`
	Feed    []Event                `json:"feed"`
	Roadmap *RoadmapData           `json:"roadmap"`
	usedNames map[string]bool
}

const maxFeedSize = 200

type Store struct {
	mu    sync.Mutex
	rooms map[string]*RoomState
}

func NewStore() *Store {
	return &Store{rooms: make(map[string]*RoomState)}
}

// GetOrCreateRoom must be called with s.mu held by the caller's method,
// so it's unexported and only used internally.
func (s *Store) getOrCreateRoomLocked(project string) *RoomState {
	room, ok := s.rooms[project]
	if !ok {
		room = &RoomState{
			Project:   project,
			Agents:    make(map[string]*AgentState),
			Feed:      []Event{},
			usedNames: make(map[string]bool),
		}
		s.rooms[project] = room
	}
	return room
}

func (s *Store) Snapshot(project string) (*RoomState, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	room, ok := s.rooms[project]
	if !ok {
		return nil, false
	}
	return cloneRoom(room), true
}

func (s *Store) ListProjects() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]string, 0, len(s.rooms))
	for p := range s.rooms {
		out = append(out, p)
	}
	return out
}

func cloneRoom(room *RoomState) *RoomState {
	agentsCopy := make(map[string]*AgentState, len(room.Agents))
	for k, v := range room.Agents {
		cp := *v
		agentsCopy[k] = &cp
	}
	feedCopy := make([]Event, len(room.Feed))
	copy(feedCopy, room.Feed)
	return &RoomState{
		Project: room.Project,
		Agents:  agentsCopy,
		Feed:    feedCopy,
		Roadmap: room.Roadmap,
	}
}

func IsIdle(lastEventAt, now time.Time, threshold time.Duration) bool {
	if lastEventAt.After(now) {
		return false // clock skew / future timestamp: treat as active, don't flap
	}
	return now.Sub(lastEventAt) >= threshold
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `cd api && go test ./... -run TestIsIdle -v`
Expected: PASS (all 4 subtests).

- [ ] **Step 5: Commit**

```bash
git add api/go.mod api/go.sum api/store.go api/store_test.go
git commit -m "feat(api): add Store core with idle detection"
```

---

### Task 2: Random display-name assignment (thread-safe)

**Files:**
- Create: `api/names.go`
- Create: `api/names_test.go`

**Interfaces:**
- Consumes: `RoomState.usedNames map[string]bool` (from Task 1, unexported field — this file lives in the same package `main`, so it can access it directly).
- Produces: `func AssignName(room *RoomState, subagentType string) string` — idempotent per `subagentType` within a room (calling twice for the same subagent_type returns the same name), picks an unused name from `namePool` on first call, deterministic fallback if pool exhausted.

- [ ] **Step 1: Write failing test**

```go
package main

import (
	"sync"
	"testing"
)

func TestAssignName_Idempotent(t *testing.T) {
	room := &RoomState{Agents: map[string]*AgentState{}, usedNames: map[string]bool{}}
	first := AssignName(room, "dev")
	second := AssignName(room, "dev")
	if first != second {
		t.Errorf("AssignName not idempotent: got %q then %q", first, second)
	}
}

func TestAssignName_NoDuplicatesAcrossRoles(t *testing.T) {
	room := &RoomState{Agents: map[string]*AgentState{}, usedNames: map[string]bool{}}
	names := map[string]bool{}
	for _, role := range []string{"pm", "analyst", "dev", "qa"} {
		n := AssignName(room, role)
		if names[n] {
			t.Errorf("duplicate name %q assigned to role %q", n, role)
		}
		names[n] = true
	}
}

func TestAssignName_ConcurrentSafe(t *testing.T) {
	room := &RoomState{Agents: map[string]*AgentState{}, usedNames: map[string]bool{}}
	var mu sync.Mutex
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			mu.Lock()
			AssignName(room, "dev")
			mu.Unlock()
		}()
	}
	wg.Wait()
	// Should not panic (race detector catches unsynchronized map access);
	// caller is responsible for holding the store lock, so this test
	// documents that AssignName itself does no internal locking.
}
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd api && go test ./... -run TestAssignName -v`
Expected: FAIL — `AssignName` undefined.

- [ ] **Step 3: Implement `names.go`**

```go
package main

var namePool = []string{
	"Zaki", "Lulu", "Pingot", "Risko", "Vino", "Dara", "Bagas", "Sari",
	"Reno", "Tia", "Yudha", "Nadia",
}

// AssignName returns a stable display name for subagentType within room.
// Caller must hold the store's lock — this function does no locking itself.
func AssignName(room *RoomState, subagentType string) string {
	if existing, ok := room.Agents[subagentType]; ok && existing.DisplayName != "" {
		return existing.DisplayName
	}
	if room.usedNames == nil {
		room.usedNames = make(map[string]bool)
	}
	for _, name := range namePool {
		if !room.usedNames[name] {
			room.usedNames[name] = true
			return name
		}
	}
	// Pool exhausted: fall back to the subagent_type itself, capitalized-ish.
	return subagentType
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `cd api && go test ./... -run TestAssignName -v -race`
Expected: PASS, no race warnings.

- [ ] **Step 5: Commit**

```bash
git add api/names.go api/names_test.go
git commit -m "feat(api): add stable random display-name assignment"
```

---

### Task 3: POST /events handler + RecordEvent logic

**Files:**
- Create: `api/events.go`
- Create: `api/events_test.go`
- Modify: `api/store.go` (add `RecordEvent` method)

**Interfaces:**
- Consumes: `Store.getOrCreateRoomLocked`, `AssignName`, `Event`, `AgentState` (Task 1-2).
- Produces: `func (s *Store) RecordEvent(payload EventPayload) (*RoomState, error)`, `type EventPayload struct { Project, SubagentType, EventType, ToolName, Summary, Timestamp string }`, HTTP handler `func postEventsHandler(store *Store, hub *Hub) gin.HandlerFunc` (hub param added as a forward declaration — Task 5 defines `Hub`; until then this file will not compile standalone, so Step 3 stubs a minimal `Hub` with a no-op `Broadcast` method here and Task 5 replaces the stub).

- [ ] **Step 1: Write failing test for `RecordEvent`**

```go
package main

import (
	"testing"
	"time"
)

func TestRecordEvent_CreatesRoomAndAgent(t *testing.T) {
	store := NewStore()
	payload := EventPayload{
		Project:      "/home/faris/Faris/Kerja/odoo-revamp",
		SubagentType: "dev",
		EventType:    "tool_use",
		ToolName:     "Edit",
		Summary:      "Edit models/account_move.py",
		Timestamp:    "2026-09-25T11:12:29+07:00",
	}

	room, err := store.RecordEvent(payload)
	if err != nil {
		t.Fatalf("RecordEvent returned error: %v", err)
	}
	agent, ok := room.Agents["dev"]
	if !ok {
		t.Fatal("expected agent 'dev' to exist")
	}
	if agent.Status != "working" {
		t.Errorf("expected status 'working', got %q", agent.Status)
	}
	if agent.LastAction != "Edit models/account_move.py" {
		t.Errorf("unexpected LastAction: %q", agent.LastAction)
	}
	if len(room.Feed) != 1 {
		t.Errorf("expected 1 feed entry, got %d", len(room.Feed))
	}
}

func TestRecordEvent_MissingProject_Errors(t *testing.T) {
	store := NewStore()
	_, err := store.RecordEvent(EventPayload{SubagentType: "dev"})
	if err == nil {
		t.Fatal("expected error for missing project field")
	}
}

func TestRecordEvent_MissingSubagentType_Errors(t *testing.T) {
	store := NewStore()
	_, err := store.RecordEvent(EventPayload{Project: "/tmp/x"})
	if err == nil {
		t.Fatal("expected error for missing subagent_type field")
	}
}

func TestRecordEvent_InvalidTimestamp_FallsBackToNow(t *testing.T) {
	store := NewStore()
	room, err := store.RecordEvent(EventPayload{
		Project:      "/tmp/x",
		SubagentType: "qa",
		Timestamp:    "not-a-timestamp",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if room.Agents["qa"].LastEventAt.IsZero() {
		t.Error("expected LastEventAt to fall back to current time, got zero value")
	}
	if time.Since(room.Agents["qa"].LastEventAt) > 5*time.Second {
		t.Error("fallback timestamp should be close to now")
	}
}

func TestRecordEvent_FeedCappedAt200(t *testing.T) {
	store := NewStore()
	for i := 0; i < 250; i++ {
		_, err := store.RecordEvent(EventPayload{Project: "/tmp/x", SubagentType: "dev", Summary: "e"})
		if err != nil {
			t.Fatalf("unexpected error at iteration %d: %v", i, err)
		}
	}
	room, _ := store.Snapshot("/tmp/x")
	if len(room.Feed) != maxFeedSize {
		t.Errorf("expected feed capped at %d, got %d", maxFeedSize, len(room.Feed))
	}
}

func TestRecordEvent_ProjectPathWithSpacesAndUnicode(t *testing.T) {
	store := NewStore()
	project := "/home/faris/Faris/Kerja/proyek keren äöü/日本語"
	room, err := store.RecordEvent(EventPayload{Project: project, SubagentType: "dev", Summary: "ok"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if room.Project != project {
		t.Errorf("expected project %q preserved as-is, got %q", project, room.Project)
	}
	if _, ok := store.Snapshot(project); !ok {
		t.Errorf("expected to find room by exact original path")
	}
}

func TestRecordEvent_ConcurrentSameSubagentType_NoRace(t *testing.T) {
	// Run with -race: two goroutines hammering the same project+subagent_type
	// must not corrupt AgentState or panic on concurrent map access.
	store := NewStore()
	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			_, err := store.RecordEvent(EventPayload{
				Project:      "/tmp/racetest",
				SubagentType: "dev",
				Summary:      "concurrent write",
			})
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		}(i)
	}
	wg.Wait()

	room, ok := store.Snapshot("/tmp/racetest")
	if !ok {
		t.Fatal("expected room to exist")
	}
	if len(room.Agents) != 1 {
		t.Errorf("expected exactly 1 agent (same subagent_type), got %d", len(room.Agents))
	}
	if len(room.Feed) != 50 {
		t.Errorf("expected 50 feed entries, got %d", len(room.Feed))
	}
}
```

Add `"sync"` to the imports at the top of `api/events_test.go` (needed for `sync.WaitGroup` in the concurrency test above).

- [ ] **Step 2: Run test, verify it fails**

Run: `cd api && go test ./... -run TestRecordEvent -v`
Expected: FAIL — `RecordEvent` / `EventPayload` undefined.

- [ ] **Step 3: Add `RecordEvent` to `api/store.go`**

Append to `api/store.go`:

```go
import "errors"
import "fmt"

func (s *Store) RecordEvent(payload EventPayload) (*RoomState, error) {
	if payload.Project == "" {
		return nil, errors.New("project field is required")
	}
	if payload.SubagentType == "" {
		return nil, errors.New("subagent_type field is required")
	}

	ts, err := time.Parse(time.RFC3339, payload.Timestamp)
	if err != nil {
		ts = time.Now()
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	room := s.getOrCreateRoomLocked(payload.Project)
	name := AssignName(room, payload.SubagentType)

	agent, ok := room.Agents[payload.SubagentType]
	if !ok {
		agent = &AgentState{SubagentType: payload.SubagentType, DisplayName: name}
		room.Agents[payload.SubagentType] = agent
	}
	agent.Status = "working"
	agent.LastAction = payload.Summary
	agent.LastEventAt = ts

	room.Feed = append(room.Feed, Event{
		SubagentType: payload.SubagentType,
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

var _ = fmt.Sprintf // placeholder import guard removed once fmt is used elsewhere; safe to drop if unused
```

(Note: drop the `fmt` import and the guard line if `go vet` flags it unused after this task — it's only here in case a later edit needs it. Prefer removing dead imports over blank-import hacks: if `go build` complains `"fmt" imported and not used`, delete both the import line and the guard line.)

- [ ] **Step 4: Write `api/events.go` (HTTP handler)**

```go
package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type EventPayload struct {
	Project      string `json:"project" binding:"required"`
	SubagentType string `json:"subagent_type" binding:"required"`
	EventType    string `json:"event_type"`
	ToolName     string `json:"tool_name"`
	Summary      string `json:"summary"`
	Timestamp    string `json:"timestamp"`
}

func postEventsHandler(store *Store, hub *Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		var payload EventPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		room, err := store.RecordEvent(payload)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		hub.BroadcastRoom(room)
		c.Status(http.StatusNoContent)
	}
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `cd api && go build ./... && go test ./... -run TestRecordEvent -v`
Expected: build succeeds (once `Hub` exists from Task 5 — for now, add a minimal stub at the bottom of `events.go` so this task compiles standalone):

```go
// Temporary stub; replaced by the real Hub in Task 5.
type Hub struct{}

func (h *Hub) BroadcastRoom(room *RoomState) {}
```

Run again: `cd api && go test ./... -v -race`
Expected: PASS, no race warnings (covers the concurrent-write test and the unicode-path test above).

- [ ] **Step 6: Commit**

```bash
git add api/store.go api/events.go api/events_test.go
git commit -m "feat(api): add RecordEvent logic and POST /events handler"
```

---

### Task 4: ROADMAP.md parser

**Files:**
- Create: `api/roadmap.go`
- Create: `api/roadmap_test.go`

**Interfaces:**
- Consumes: `RoadmapData`, `RoadmapModule` (Task 1).
- Produces: `func ParseRoadmap(content string) (*RoadmapData, error)`.

**Roadmap.md convention (defined here, must be documented for the PM agent — see Task 9):**

```markdown
# Roadmap

## M01: Fondasi data
Progress: 40%

## M02: Keamanan & identitas
Progress: 0%
```

Each module is a `## ` heading (title = text after `## `), followed somewhere before the next `## ` heading by a line matching `Progress: N%`. Progress must be an integer 0-100.

- [ ] **Step 1: Write failing test**

```go
package main

import "testing"

func TestParseRoadmap_Basic(t *testing.T) {
	content := "# Roadmap\n\n## M01: Fondasi data\nProgress: 40%\n\n## M02: Keamanan\nProgress: 0%\n"
	data, err := ParseRoadmap(content)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(data.Modules) != 2 {
		t.Fatalf("expected 2 modules, got %d", len(data.Modules))
	}
	if data.Modules[0].Title != "M01: Fondasi data" || data.Modules[0].Progress != 40 {
		t.Errorf("unexpected module 0: %+v", data.Modules[0])
	}
	if data.Modules[1].Title != "M02: Keamanan" || data.Modules[1].Progress != 0 {
		t.Errorf("unexpected module 1: %+v", data.Modules[1])
	}
}

func TestParseRoadmap_EmptyContent_ReturnsEmptyNotError(t *testing.T) {
	data, err := ParseRoadmap("")
	if err != nil {
		t.Fatalf("expected no error for empty content, got %v", err)
	}
	if len(data.Modules) != 0 {
		t.Errorf("expected 0 modules, got %d", len(data.Modules))
	}
}

func TestParseRoadmap_ModuleWithoutProgress_Skipped(t *testing.T) {
	content := "## M01: No progress line here\n\n## M02: Has progress\nProgress: 50%\n"
	data, err := ParseRoadmap(content)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(data.Modules) != 1 {
		t.Fatalf("expected 1 module (the one with valid progress), got %d: %+v", len(data.Modules), data.Modules)
	}
	if data.Modules[0].Title != "M02: Has progress" {
		t.Errorf("unexpected surviving module: %+v", data.Modules[0])
	}
}

func TestParseRoadmap_OutOfRangeProgress_Clamped(t *testing.T) {
	content := "## M01: Over\nProgress: 150%\n\n## M02: Negative\nProgress: -10%\n"
	data, err := ParseRoadmap(content)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if data.Modules[0].Progress != 100 {
		t.Errorf("expected clamp to 100, got %d", data.Modules[0].Progress)
	}
	if data.Modules[1].Progress != 0 {
		t.Errorf("expected clamp to 0, got %d", data.Modules[1].Progress)
	}
}
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd api && go test ./... -run TestParseRoadmap -v`
Expected: FAIL — `ParseRoadmap` undefined.

- [ ] **Step 3: Implement `api/roadmap.go`**

```go
package main

import (
	"regexp"
	"strconv"
	"strings"
)

var (
	moduleHeadingRe = regexp.MustCompile(`(?m)^##\s+(.+?)\s*$`)
	progressRe      = regexp.MustCompile(`(?m)^Progress:\s*(-?\d+)%\s*$`)
)

// ParseRoadmap parses a ROADMAP.md convention: each "## Title" section
// optionally followed (before the next "## ") by a "Progress: N%" line.
// Modules without a valid Progress line are skipped, not errored.
// Malformed content (no headings at all) returns an empty, non-nil result.
func ParseRoadmap(content string) (*RoadmapData, error) {
	headingMatches := moduleHeadingRe.FindAllStringSubmatchIndex(content, -1)
	data := &RoadmapData{Modules: []RoadmapModule{}}

	for i, m := range headingMatches {
		title := strings.TrimSpace(content[m[2]:m[3]])
		sectionStart := m[1]
		sectionEnd := len(content)
		if i+1 < len(headingMatches) {
			sectionEnd = headingMatches[i+1][0]
		}
		section := content[sectionStart:sectionEnd]

		pm := progressRe.FindStringSubmatch(section)
		if pm == nil {
			continue // no progress line: skip this module
		}
		progress, err := strconv.Atoi(pm[1])
		if err != nil {
			continue
		}
		if progress < 0 {
			progress = 0
		}
		if progress > 100 {
			progress = 100
		}

		data.Modules = append(data.Modules, RoadmapModule{Title: title, Progress: progress})
	}

	return data, nil
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `cd api && go test ./... -run TestParseRoadmap -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/roadmap.go api/roadmap_test.go
git commit -m "feat(api): add ROADMAP.md parser with defined markdown convention"
```

---

### Task 5: Websocket hub + real Hub.BroadcastRoom (replaces Task 3 stub)

**Files:**
- Create: `api/ws.go`
- Modify: `api/events.go` (remove the temporary `Hub` stub added in Task 3, Step 5)

**Interfaces:**
- Consumes: `RoomState` (Task 1).
- Produces: `type Hub struct{...}`, `func NewHub() *Hub`, `func (h *Hub) BroadcastRoom(room *RoomState)`, `func (h *Hub) ServeWS(store *Store) gin.HandlerFunc` (handles `GET /ws?project=...`, upgrades, registers client for that project, sends initial snapshot, unregisters on close).

- [ ] **Step 1: Remove the Task 3 stub**

In `api/events.go`, delete these lines added in Task 3 Step 5:

```go
// Temporary stub; replaced by the real Hub in Task 5.
type Hub struct{}

func (h *Hub) BroadcastRoom(room *RoomState) {}
```

- [ ] **Step 2: Write `api/ws.go`**

```go
package main

import (
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true }, // localhost-only tool, no CORS concerns
}

type client struct {
	conn    *websocket.Conn
	project string
	send    chan RoomState
}

type Hub struct {
	mu      sync.Mutex
	clients map[*client]bool
}

func NewHub() *Hub {
	return &Hub{clients: make(map[*client]bool)}
}

func (h *Hub) BroadcastRoom(room *RoomState) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.clients {
		if c.project != room.Project {
			continue
		}
		select {
		case c.send <- *room:
		default:
			log.Printf("dropping slow client for project %s", room.Project)
		}
	}
}

func (h *Hub) ServeWS(store *Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		project := c.Query("project")
		if project == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "project query param is required"})
			return
		}

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("ws upgrade failed: %v", err)
			return
		}

		cl := &client{conn: conn, project: project, send: make(chan RoomState, 8)}
		h.mu.Lock()
		h.clients[cl] = true
		h.mu.Unlock()

		defer func() {
			h.mu.Lock()
			delete(h.clients, cl)
			h.mu.Unlock()
			conn.Close()
		}()

		if snapshot, ok := store.Snapshot(project); ok {
			if err := conn.WriteJSON(snapshot); err != nil {
				return
			}
		}

		go func() {
			for room := range cl.send {
				if err := conn.WriteJSON(room); err != nil {
					return
				}
			}
		}()

		// Drain reads to detect client disconnect (client sends nothing meaningful).
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				close(cl.send)
				return
			}
		}
	}
}
```

- [ ] **Step 3: Verify build**

Run: `cd api && go build ./...`
Expected: no errors.

- [ ] **Step 4: Manual reconnect test (documents Review Focus item 1)**

Run backend (after Task 6 wires `main.go`; if `main.go` doesn't exist yet, skip this step and return to it after Task 6), connect with `websocat "ws://localhost:8090/ws?project=/tmp/x"`, kill and restart the backend process, confirm `websocat` errors out (expected — client-side reconnect logic is a frontend concern, Task 10) rather than hanging silently. Note the observed behavior in the commit message.

- [ ] **Step 5: Commit**

```bash
git add api/ws.go api/events.go
git commit -m "feat(api): add websocket hub with per-project broadcast"
```

---

### Task 6: Wire main.go (routes, idle ticker, fsnotify watcher)

**Files:**
- Create: `api/main.go`
- Create: `api/idle.go`
- Create: `api/idle_test.go`
- Create: `api/watcher.go`
- Create: `api/rooms.go`

**Interfaces:**
- Consumes: everything from Tasks 1-5.
- Produces: `func (s *Store) SweepIdle(threshold time.Duration, now time.Time) []*RoomState` (rooms whose agents changed status, for re-broadcast), `func WatchRoadmap(store *Store, hub *Hub, project string) error` (starts an fsnotify watcher on `<project>/ROADMAP.md`, calls `store.UpdateRoadmap` + `hub.BroadcastRoom` on write), `func (s *Store) UpdateRoadmap(project string, data *RoadmapData)`, runnable `main()`.

- [ ] **Step 1: Write failing test for `SweepIdle`**

```go
package main

import (
	"testing"
	"time"
)

func TestSweepIdle_MarksIdleAgents(t *testing.T) {
	store := NewStore()
	store.RecordEvent(EventPayload{Project: "/tmp/x", SubagentType: "dev", Timestamp: time.Now().Add(-60 * time.Second).Format(time.RFC3339)})

	changed := store.SweepIdle(45*time.Second, time.Now())

	if len(changed) != 1 {
		t.Fatalf("expected 1 changed room, got %d", len(changed))
	}
	if changed[0].Agents["dev"].Status != "idle" {
		t.Errorf("expected status idle, got %q", changed[0].Agents["dev"].Status)
	}
}

func TestSweepIdle_NoChangeWhenActive(t *testing.T) {
	store := NewStore()
	store.RecordEvent(EventPayload{Project: "/tmp/x", SubagentType: "dev"}) // timestamp defaults to now

	changed := store.SweepIdle(45*time.Second, time.Now())

	if len(changed) != 0 {
		t.Errorf("expected no changed rooms, got %d", len(changed))
	}
}
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd api && go test ./... -run TestSweepIdle -v`
Expected: FAIL — `SweepIdle` undefined.

- [ ] **Step 3: Implement `api/idle.go`**

```go
package main

import (
	"time"
)

// SweepIdle marks agents idle if they've had no event within threshold.
// Returns the rooms that had at least one agent change status, for callers
// that want to re-broadcast.
func (s *Store) SweepIdle(threshold time.Duration, now time.Time) []*RoomState {
	s.mu.Lock()
	defer s.mu.Unlock()

	var changed []*RoomState
	for _, room := range s.rooms {
		roomChanged := false
		for _, agent := range room.Agents {
			if agent.Status == "working" && IsIdle(agent.LastEventAt, now, threshold) {
				agent.Status = "idle"
				roomChanged = true
			}
		}
		if roomChanged {
			changed = append(changed, cloneRoom(room))
		}
	}
	return changed
}

func (s *Store) UpdateRoadmap(project string, data *RoadmapData) *RoomState {
	s.mu.Lock()
	defer s.mu.Unlock()
	room := s.getOrCreateRoomLocked(project)
	room.Roadmap = data
	return cloneRoom(room)
}

func startIdleTicker(store *Store, hub *Hub) {
	ticker := time.NewTicker(15 * time.Second)
	go func() {
		for range ticker.C {
			for _, room := range store.SweepIdle(45*time.Second, time.Now()) {
				hub.BroadcastRoom(room)
			}
		}
	}()
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `cd api && go test ./... -run TestSweepIdle -v`
Expected: PASS.

- [ ] **Step 5: Implement `api/watcher.go`**

```go
package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/fsnotify/fsnotify"
)

// WatchRoadmap starts a background watcher on <project>/ROADMAP.md.
// Safe to call multiple times for the same project; callers should
// track which projects are already watched (see main.go) to avoid
// spawning duplicate watchers.
func WatchRoadmap(store *Store, hub *Hub, project string) error {
	roadmapPath := filepath.Join(project, "ROADMAP.md")

	loadAndBroadcast := func() {
		content, err := os.ReadFile(roadmapPath)
		if err != nil {
			return // no ROADMAP.md yet: leave Roadmap nil, not an error
		}
		data, err := ParseRoadmap(string(content))
		if err != nil {
			log.Printf("failed to parse %s: %v", roadmapPath, err)
			return
		}
		room := store.UpdateRoadmap(project, data)
		hub.BroadcastRoom(room)
	}

	loadAndBroadcast() // initial read

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	if err := watcher.Add(project); err != nil {
		watcher.Close()
		return err
	}

	go func() {
		defer watcher.Close()
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				if filepath.Base(event.Name) == "ROADMAP.md" {
					loadAndBroadcast()
				}
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				log.Printf("watcher error for %s: %v", project, err)
			}
		}
	}()

	return nil
}
```

- [ ] **Step 6: Implement `api/rooms.go`**

```go
package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func getRoomsHandler(store *Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"projects": store.ListProjects()})
	}
}

func getRoomSnapshotHandler(store *Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		project := c.Query("project")
		if project == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "project query param is required"})
			return
		}
		room, ok := store.Snapshot(project)
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"error": "no room for this project yet"})
			return
		}
		c.JSON(http.StatusOK, room)
	}
}
```

- [ ] **Step 7: Implement `api/main.go`**

```go
package main

import (
	"log"
	"os"
	"sync"

	"github.com/gin-gonic/gin"
)

func main() {
	store := NewStore()
	hub := NewHub()
	startIdleTicker(store, hub)

	var watchedMu sync.Mutex
	watched := make(map[string]bool)
	ensureWatched := func(project string) {
		watchedMu.Lock()
		defer watchedMu.Unlock()
		if watched[project] {
			return
		}
		watched[project] = true
		if err := WatchRoadmap(store, hub, project); err != nil {
			log.Printf("failed to watch roadmap for %s: %v", project, err)
		}
	}

	r := gin.Default()

	r.POST("/events", func(c *gin.Context) {
		postEventsHandler(store, hub)(c)
	})
	r.Use(func(c *gin.Context) {
		c.Next()
	})
	r.GET("/rooms", getRoomsHandler(store))
	r.GET("/rooms/snapshot", getRoomSnapshotHandler(store))
	r.GET("/ws", hub.ServeWS(store))

	// Wrap POST /events to also start watching that project's roadmap
	// the first time we see it.
	r.POST("/events", func(c *gin.Context) {
		var payload EventPayload
		if err := c.ShouldBindJSON(&payload); err == nil && payload.Project != "" {
			ensureWatched(payload.Project)
		}
	})

	port := os.Getenv("AGENCY_PORT")
	if port == "" {
		port = "8090"
	}
	log.Printf("agency-dashboard backend listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
```

**Fix before running:** the snippet above registers `POST /events` twice (a copy-paste artifact from drafting) — the second registration would panic at startup (`gin` rejects duplicate routes). Replace both `r.POST("/events", ...)` blocks and the empty `r.Use` with a single registration:

```go
	r.POST("/events", func(c *gin.Context) {
		var payload EventPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		if payload.Project != "" {
			ensureWatched(payload.Project)
		}
		room, err := store.RecordEvent(payload)
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		hub.BroadcastRoom(room)
		c.Status(204)
	})
	r.GET("/rooms", getRoomsHandler(store))
	r.GET("/rooms/snapshot", getRoomSnapshotHandler(store))
	r.GET("/ws", hub.ServeWS(store))
```

This also means `postEventsHandler` from Task 3 is now dead code (superseded by the inline handler here, which additionally calls `ensureWatched`) — delete `postEventsHandler` from `api/events.go` in this step to avoid two divergent implementations of the same behavior.

- [ ] **Step 8: Build and smoke-test manually**

```bash
cd api && go build ./... && go vet ./...
AGENCY_PORT=8090 ./api &
curl -s -X POST localhost:8090/events -d '{"project":"/tmp/agencytest","subagent_type":"dev","summary":"hello"}' -H 'Content-Type: application/json' -w '\n%{http_code}\n'
curl -s localhost:8090/rooms
curl -s "localhost:8090/rooms/snapshot?project=/tmp/agencytest"
kill %1
```

Expected: `204`, `{"projects":["/tmp/agencytest"]}`, and a snapshot JSON with `"dev"` agent present.

- [ ] **Step 9: Commit**

```bash
git add api/main.go api/idle.go api/idle_test.go api/watcher.go api/rooms.go api/events.go
git commit -m "feat(api): wire main.go with routes, idle ticker, roadmap watcher"
```

---

### Task 7: Hook script

**Files:**
- Create: `hooks/agency-notify.sh`

**Interfaces:**
- Consumes: `POST /events` (Task 6), snake_case payload fields per Global Constraints.
- Produces: an executable script Claude Code hooks invoke with the hook JSON on stdin.

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# Sends a Claude Code hook event to the agency-dashboard backend.
# MUST NEVER block Claude Code: always exit 0, fail silently.
set -u

AGENCY_URL="${AGENCY_URL:-http://localhost:8090/events}"

INPUT="$(cat)"

# Fields per Claude Code hooks (verified against code.claude.com/docs/en/hooks
# at plan-writing time): hook_event_name, cwd, tool_name, tool_input,
# agent_type (SubagentStop only). subagent_type is not a native hook field —
# we derive it from agent_type on SubagentStop, and leave it empty on plain
# tool events fired outside a subagent (main-session tool calls), which the
# backend treats as an event with no dedicated avatar (skipped client-side).
EVENT_NAME=$(echo "$INPUT" | jq -r '.hook_event_name // empty')
PROJECT=$(echo "$INPUT" | jq -r '.cwd // empty')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // empty')
LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // empty')

[ -z "$PROJECT" ] && exit 0   # nothing to report without a project path
[ -z "$AGENT_TYPE" ] && exit 0 # v1 only tracks subagent activity, not main-session

SUMMARY="$TOOL_NAME"
[ -n "$LAST_MSG" ] && SUMMARY="${LAST_MSG:0:120}"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

PAYLOAD=$(jq -n \
  --arg project "$PROJECT" \
  --arg subagent_type "$AGENT_TYPE" \
  --arg event_type "$EVENT_NAME" \
  --arg tool_name "$TOOL_NAME" \
  --arg summary "$SUMMARY" \
  --arg timestamp "$TIMESTAMP" \
  '{project: $project, subagent_type: $subagent_type, event_type: $event_type, tool_name: $tool_name, summary: $summary, timestamp: $timestamp}')

curl -s -m 2 -X POST "$AGENCY_URL" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD" >/dev/null 2>&1

exit 0
```

- [ ] **Step 2: Make executable**

```bash
chmod +x hooks/agency-notify.sh
```

- [ ] **Step 3: Manual test with sample payload**

```bash
cd /home/faris/Faris/Kerja/agency-dashboard
AGENCY_URL="http://localhost:8090/events" ./hooks/agency-notify.sh <<'EOF'
{"hook_event_name":"SubagentStop","cwd":"/tmp/agencytest","agent_type":"dev","last_assistant_message":"Implemented the fix for the null pointer bug."}
EOF
echo "exit code: $?"
```

Run backend first (`cd api && AGENCY_PORT=8090 ./api &`), then run the test above, then `curl -s "localhost:8090/rooms/snapshot?project=/tmp/agencytest"` and confirm the `dev` agent's `last_action` reflects the truncated message. Kill the backend after (`kill %1`).

- [ ] **Step 4: Test silent-failure behavior (backend down)**

```bash
# With no backend running:
AGENCY_URL="http://localhost:19999/events" ./hooks/agency-notify.sh <<'EOF'
{"hook_event_name":"SubagentStop","cwd":"/tmp/agencytest","agent_type":"dev","last_assistant_message":"test"}
EOF
echo "exit code: $?"
```

Expected: `exit code: 0` even though the POST failed — confirms the Global Constraint ("hook never blocks Claude Code") holds.

- [ ] **Step 5: Commit**

```bash
git add hooks/agency-notify.sh
git commit -m "feat(hooks): add Claude Code hook script for agency-dashboard events"
```

---

### Task 8: Next.js scaffold + types + websocket hook

**Files:**
- Create: `web/` (scaffolded)
- Create: `web/lib/types.ts`
- Create: `web/lib/useAgencySocket.ts`

**Interfaces:**
- Produces: TypeScript types `AgentState`, `RoomState`, `Event`, `RoadmapData`, `RoadmapModule` mirroring the Go JSON shapes from Task 1; `function useAgencySocket(project: string | null): RoomState | null` — a React hook that connects to `ws://localhost:8090/ws?project=<encodeURIComponent(project)>`, auto-reconnects with backoff on close/error, returns the latest `RoomState`.

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd /home/faris/Faris/Kerja/agency-dashboard
npx create-next-app@latest web --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint --use-npm
```

When prompted, accept defaults. This creates `web/` with `app/`, `package.json`, etc.

- [ ] **Step 2: Add `web/lib/types.ts`**

```typescript
export interface RoadmapModule {
  title: string;
  progress: number;
}

export interface RoadmapData {
  modules: RoadmapModule[];
}

export interface AgentState {
  subagent_type: string;
  display_name: string;
  status: "working" | "idle";
  last_action: string;
  last_event_at: string;
}

export interface FeedEvent {
  subagent_type: string;
  event_type: string;
  tool_name: string;
  summary: string;
  timestamp: string;
}

export interface RoomState {
  project: string;
  agents: Record<string, AgentState>;
  feed: FeedEvent[];
  roadmap: RoadmapData | null;
}
```

- [ ] **Step 3: Write failing-then-passing check for the socket hook (manual, no test framework per plan's testing approach)**

Create `web/lib/useAgencySocket.ts`:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomState } from "./types";

const BACKEND_HOST = process.env.NEXT_PUBLIC_AGENCY_WS_HOST || "localhost:8090";

export function useAgencySocket(project: string | null): RoomState | null {
  const [room, setRoom] = useState<RoomState | null>(null);
  const reconnectDelay = useRef(1000);

  useEffect(() => {
    if (!project) {
      setRoom(null);
      return;
    }

    let ws: WebSocket | null = null;
    let closedByEffect = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const url = `ws://${BACKEND_HOST}/ws?project=${encodeURIComponent(project!)}`;
      ws = new WebSocket(url);

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data) as RoomState;
          setRoom(data);
        } catch {
          // malformed frame: ignore, wait for next message
        }
      };

      ws.onopen = () => {
        reconnectDelay.current = 1000; // reset backoff on success
      };

      ws.onclose = () => {
        if (closedByEffect) return;
        reconnectTimer = setTimeout(connect, reconnectDelay.current);
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 15000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    return () => {
      closedByEffect = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [project]);

  return room;
}
```

- [ ] **Step 4: Manual verification**

Run backend (`cd api && AGENCY_PORT=8090 ./api &`), run `cd web && npm run dev -- -p 3090`, temporarily add a debug page (`web/app/debug/page.tsx`) that calls `useAgencySocket("/tmp/agencytest")` and `console.log`s the result, POST a test event via `curl` (as in Task 6 Step 8), confirm the browser console logs the updated `RoomState`. Delete the debug page after confirming (it's throwaway, not part of the shipped UI).

- [ ] **Step 5: Commit**

```bash
git add web/
git commit -m "feat(web): scaffold Next.js app with types and websocket hook"
```

---

### Task 9: RoomSelector + Feed + Roadmap components

**Files:**
- Create: `web/components/RoomSelector.tsx`
- Create: `web/components/Feed.tsx`
- Create: `web/components/Roadmap.tsx`

**Interfaces:**
- Consumes: `RoomState`, `FeedEvent`, `RoadmapData` (Task 8).
- Produces: `RoomSelector({ selected, onSelect }: { selected: string | null; onSelect: (project: string) => void })` (fetches `GET /rooms` on mount, polls every 5s), `Feed({ events }: { events: FeedEvent[] })`, `Roadmap({ data }: { data: RoadmapData | null })`.

- [ ] **Step 1: `web/components/RoomSelector.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_AGENCY_HTTP_URL || "http://localhost:8090";

export function RoomSelector({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (project: string) => void;
}) {
  const [projects, setProjects] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchRooms() {
      try {
        const res = await fetch(`${BACKEND_URL}/rooms`);
        const data = await res.json();
        if (!cancelled) setProjects(data.projects || []);
      } catch {
        // backend down: leave list as-is, try again next poll
      }
    }

    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (projects.length === 0) {
    return <div className="text-sm text-gray-500">Belum ada aktivitas agent terdeteksi.</div>;
  }

  return (
    <select
      className="border rounded px-2 py-1"
      value={selected ?? ""}
      onChange={(e) => onSelect(e.target.value)}
    >
      <option value="" disabled>
        Pilih project
      </option>
      {projects.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: `web/components/Feed.tsx`**

```tsx
import type { FeedEvent } from "@/lib/types";

export function Feed({ events }: { events: FeedEvent[] }) {
  const recent = [...events].reverse(); // newest first

  return (
    <div className="overflow-y-auto max-h-[600px] border rounded p-2">
      <h2 className="font-semibold mb-2">Aktivitas langsung</h2>
      {recent.length === 0 && <div className="text-sm text-gray-500">Belum ada event.</div>}
      <ul className="space-y-1 text-sm">
        {recent.map((e, i) => (
          <li key={i} className="border-b pb-1">
            <span className="font-medium">{e.subagent_type}</span>{" "}
            <span className="text-gray-500">{new Date(e.timestamp).toLocaleTimeString()}</span>
            <div>{e.summary || e.tool_name}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: `web/components/Roadmap.tsx`**

```tsx
import type { RoadmapData } from "@/lib/types";

export function Roadmap({ data }: { data: RoadmapData | null }) {
  if (!data || data.modules.length === 0) {
    return <div className="text-sm text-gray-500">Belum ada ROADMAP.md untuk project ini.</div>;
  }

  return (
    <div className="border rounded p-2">
      <h2 className="font-semibold mb-2">Roadmap</h2>
      <ul className="space-y-2">
        {data.modules.map((m) => (
          <li key={m.title}>
            <div className="flex justify-between text-sm">
              <span>{m.title}</span>
              <span>{m.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded h-2">
              <div className="bg-green-500 h-2 rounded" style={{ width: `${m.progress}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Manual verification**

`npm run dev -- -p 3090` (backend must be running), temporarily render `<RoomSelector selected={null} onSelect={console.log} />` on the debug page (or wire into Task 10's page directly, skipping a separate manual check if Task 10 follows immediately in the same session).

- [ ] **Step 5: Commit**

```bash
git add web/components/
git commit -m "feat(web): add RoomSelector, Feed, Roadmap components"
```

---

### Task 10: Office avatar view + /kerja page (wires everything together)

**Files:**
- Create: `web/components/Office.tsx`
- Create: `web/app/kerja/page.tsx`

**Interfaces:**
- Consumes: `useAgencySocket`, `RoomSelector`, `Feed`, `Roadmap` (Tasks 8-9).
- Produces: the `/kerja` route, the full working page.

- [ ] **Step 1: `web/components/Office.tsx`**

```tsx
import type { AgentState } from "@/lib/types";

const ROLE_POSITIONS: Record<string, { left: string; top: string }> = {
  pm: { left: "10%", top: "20%" },
  analyst: { left: "35%", top: "50%" },
  dev: { left: "60%", top: "30%" },
  qa: { left: "80%", top: "60%" },
};

export function Office({ agents }: { agents: Record<string, AgentState> }) {
  return (
    <div className="relative border rounded bg-amber-50 h-[400px] overflow-hidden">
      {Object.values(agents).map((agent) => {
        const pos = ROLE_POSITIONS[agent.subagent_type] ?? { left: "50%", top: "50%" };
        return (
          <div
            key={agent.subagent_type}
            className="absolute flex flex-col items-center transition-all duration-500"
            style={{ left: pos.left, top: pos.top }}
          >
            <div
              className={`px-2 py-1 rounded text-xs text-white ${
                agent.status === "working" ? "bg-green-600" : "bg-gray-400"
              }`}
            >
              {agent.display_name} · {agent.subagent_type}
            </div>
            <div className="text-xs bg-white border rounded px-1 mt-1 max-w-[160px] truncate">
              {agent.status === "working" ? agent.last_action : "Istirahat"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

(This is deliberately flat CSS positioning, not a sprite-based isometric renderer — matches the spec's non-goal "bukan true 3D" and ponytail's YAGNI: ship the simplest thing that shows status/position per role, upgrade to sprites/art later if wanted.)

- [ ] **Step 2: `web/app/kerja/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { RoomSelector } from "@/components/RoomSelector";
import { Office } from "@/components/Office";
import { Feed } from "@/components/Feed";
import { Roadmap } from "@/components/Roadmap";
import { useAgencySocket } from "@/lib/useAgencySocket";

export default function KerjaPage() {
  const [project, setProject] = useState<string | null>(null);
  const room = useAgencySocket(project);

  return (
    <main className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Ruang Kerja Tim</h1>
        <RoomSelector selected={project} onSelect={setProject} />
      </div>

      {!project && <div className="text-gray-500">Pilih project untuk lihat aktivitas.</div>}

      {project && (
        <div className="grid grid-cols-[250px_1fr_300px] gap-4">
          <Feed events={room?.feed ?? []} />
          <Office agents={room?.agents ?? {}} />
          <Roadmap data={room?.roadmap ?? null} />
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Manual golden-path test**

```bash
cd api && AGENCY_PORT=8090 ./api &
cd web && npm run dev -- -p 3090 &
```

Open `http://localhost:3090/kerja`. Send a test event:

```bash
curl -s -X POST localhost:8090/events -H 'Content-Type: application/json' \
  -d '{"project":"/tmp/agencytest","subagent_type":"dev","summary":"Testing UI update","tool_name":"Edit"}'
```

Select `/tmp/agencytest` in the room selector. Confirm: avatar for "dev" appears with green "working" badge and the summary text; Feed panel shows the event; Roadmap panel shows the empty state (no `ROADMAP.md` in `/tmp/agencytest`).

Then create a roadmap file and confirm the panel updates without restarting anything:

```bash
mkdir -p /tmp/agencytest
cat > /tmp/agencytest/ROADMAP.md <<'EOF'
## M01: Test module
Progress: 50%
EOF
```

Refresh is not needed — the fsnotify watcher + websocket broadcast should push the update live (confirm before moving on; if it doesn't update, the bug is most likely `ensureWatched` not being called for a project with no prior event, or the watcher target being the file rather than its parent directory — fsnotify watches directories, not files, on Linux).

- [ ] **Step 4: Kill dev servers**

```bash
kill %1 %2
```

- [ ] **Step 5: Commit**

```bash
git add web/components/Office.tsx web/app/kerja/page.tsx
git commit -m "feat(web): add Office view and /kerja page wiring live data end-to-end"
```

---

### Task 11: Global hook registration in `~/.claude/settings.json` + PM agent roadmap convention

**Files:**
- Modify: `~/.claude/settings.json` (user's global Claude Code config — **show diff and get explicit confirmation before writing**, per Global Constraints)
- Modify: `~/.claude/agents/pm.md`

**Interfaces:**
- Consumes: `hooks/agency-notify.sh` (Task 7), the `ROADMAP.md` convention defined in Task 4.
- Produces: a working end-to-end pipeline from real Claude Code sub-agent activity to the dashboard.

- [ ] **Step 1: Read current `~/.claude/settings.json`**

Read the file. It already has other config (ccstatusline, etc. per prior session history) — this step must **merge**, not overwrite.

- [ ] **Step 2: Propose the hook addition, show as a diff, wait for explicit confirmation**

The addition needed (merge into existing `"hooks"` key if present, or add a `"hooks"` key if absent):

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/home/faris/Faris/Kerja/agency-dashboard/hooks/agency-notify.sh"
          }
        ]
      }
    ]
  }
}
```

Present this exact diff to the user before writing. Do not proceed to Step 3 without an explicit yes — this file affects every future Claude Code session, not just this project.

- [ ] **Step 3: Apply the merge (after confirmation)**

Use the Edit tool on `~/.claude/settings.json`, preserving all existing keys.

- [ ] **Step 4: Update `~/.claude/agents/pm.md` with the ROADMAP.md convention**

Add a line to the PM agent's responsibilities (after the existing "Keep task lists short and concrete" bullet) documenting the exact format Task 4's parser expects:

```markdown
- When asked to produce a roadmap file, write `ROADMAP.md` in the project root using this exact format so the agency-dashboard can parse it: each module as a `## Title` heading, followed by a `Progress: N%` line (integer 0-100) before the next `##` heading.
```

- [ ] **Step 5: End-to-end sanity test with a real sub-agent**

```bash
cd api && AGENCY_PORT=8090 ./api &
cd web && npm run dev -- -p 3090 &
```

Open `http://localhost:3090/kerja` in a browser. In a separate Claude Code session, in some real project directory, invoke the `dev` subagent on a trivial task (e.g. "use the dev subagent to add a comment to a file"). Confirm the dashboard shows the `dev` avatar going `working` → `idle` for that project, without any manual event posting. This is the plan's final acceptance check — the spec's stated intent ("bukan dummy... data harus dari aktivitas sub-agent beneran") is only satisfied once this step passes.

- [ ] **Step 6: Kill dev servers, commit**

```bash
kill %1 %2
git add ~/.claude/agents/pm.md
git -C /home/faris/Faris/Kerja/agency-dashboard commit --allow-empty -m "chore: document ROADMAP.md convention in pm.md and confirm global hook wiring"
```

(Note: `~/.claude/agents/pm.md` lives outside this repo's git tree — commit it separately if `~/.claude/agents/` is itself a tracked repo, or just note in the empty commit message that it was updated manually; don't `git add` a path outside the repo root.)

---

## Post-plan follow-ups (explicitly out of scope for this plan)

- Sprite-based isometric art instead of the flat CSS `Office.tsx` (v1 ships functional, not pretty).
- Token/cost counter (spec marks this best-effort/optional; would require parsing `transcript_path` JSONL, whose exact schema wasn't confirmed during planning — needs its own spike).
- Cloudflare tunnel / remote access setup (mentioned by user as a nice-to-have, not required for v1).
- Multi-project simultaneous view (v1 is one room at a time via the selector).
