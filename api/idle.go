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
