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
