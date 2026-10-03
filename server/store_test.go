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
