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
