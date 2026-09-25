package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func getRoomsHandler(store *Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"projects": store.ListProjects()})
	}
}

func getRoomSnapshotHandler(store *Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		project := c.Query("project")
		if project == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "project query param is required"})
			return
		}
		room, ok := store.Snapshot(project)
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"error": "no room for this project yet"})
			return
		}
		c.JSON(http.StatusOK, room)
	}
}
