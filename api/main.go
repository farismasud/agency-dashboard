package main

import (
	"log"
	"os"
	"sync"

	"github.com/gin-gonic/gin"
)

const frontendOrigin = "http://localhost:3090"

func corsMiddleware(c *gin.Context) {
	c.Header("Access-Control-Allow-Origin", frontendOrigin)
	c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	c.Header("Access-Control-Allow-Headers", "Content-Type")
	if c.Request.Method == "OPTIONS" {
		c.AbortWithStatus(204)
		return
	}
	c.Next()
}

// newRouter builds the full route table. Split out from main() so tests can
// exercise routes/middleware via httptest without binding a real port.
func newRouter(store *Store, hub *Hub) *gin.Engine {
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
	r.Use(corsMiddleware)

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

	return r
}

func main() {
	store := NewStore()
	hub := NewHub()
	startIdleTicker(store, hub)

	r := newRouter(store, hub)

	port := os.Getenv("AGENCY_PORT")
	if port == "" {
		port = "8090"
	}
	log.Printf("agency-dashboard backend listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
