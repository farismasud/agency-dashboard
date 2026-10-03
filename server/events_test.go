package main

import (
	"sync"
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
