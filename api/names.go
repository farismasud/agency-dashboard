package main

var namePool = []string{
	"Zaki", "Lulu", "Pingot", "Risko", "Vino", "Dara", "Bagas", "Sari",
	"Reno", "Tia", "Yudha", "Nadia",
}

// AssignName returns a stable display name for subagentType within room.
// Idempotent per subagentType (tracked in room.assignedNames), independent
// of whether room.Agents[subagentType] has been populated yet — RecordEvent
// (Task 3) calls this before it creates the AgentState entry.
// Caller must hold the store's lock — this function does no locking itself.
func AssignName(room *RoomState, subagentType string) string {
	if room.assignedNames == nil {
		room.assignedNames = make(map[string]string)
	}
	if name, ok := room.assignedNames[subagentType]; ok {
		return name
	}
	if room.usedNames == nil {
		room.usedNames = make(map[string]bool)
	}
	for _, name := range namePool {
		if !room.usedNames[name] {
			room.usedNames[name] = true
			room.assignedNames[subagentType] = name
			return name
		}
	}
	room.assignedNames[subagentType] = subagentType
	return subagentType
}
