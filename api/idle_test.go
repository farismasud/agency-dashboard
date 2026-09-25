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
	store.RecordEvent(EventPayload{Project: "/tmp/x", SubagentType: "dev"})

	changed := store.SweepIdle(45*time.Second, time.Now())

	if len(changed) != 0 {
		t.Errorf("expected no changed rooms, got %d", len(changed))
	}
}
