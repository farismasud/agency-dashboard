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
		if err := WatchRoadmap(store, hub, project); err != nil {
			// Don't mark as watched on failure (e.g. project dir doesn't
			// exist yet) — retry on the next event for this project.
			log.Printf("failed to watch roadmap for %s: %v", project, err)
			return
		}
		watched[project] = true
	}

	r := gin.Default()

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

	port := os.Getenv("AGENCY_PORT")
	if port == "" {
		port = "8090"
	}
	log.Printf("agency-dashboard backend listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
