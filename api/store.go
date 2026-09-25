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
	Project   string                 `json:"project"`
	Agents    map[string]*AgentState `json:"agents"`
	Feed      []Event                `json:"feed"`
	Roadmap   *RoadmapData           `json:"roadmap"`
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
