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
}
