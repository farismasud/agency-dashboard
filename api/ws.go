package main

import (
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true }, // localhost-only tool, no CORS concerns
}

type client struct {
	conn    *websocket.Conn
	project string
	send    chan RoomState
}

type Hub struct {
	mu      sync.Mutex
	clients map[*client]bool
}

func NewHub() *Hub {
	return &Hub{clients: make(map[*client]bool)}
}

func (h *Hub) BroadcastRoom(room *RoomState) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.clients {
		if c.project != room.Project {
			continue
		}
		select {
		case c.send <- *room:
		default:
			log.Printf("dropping slow client for project %s", room.Project)
		}
	}
}

func (h *Hub) ServeWS(store *Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		project := c.Query("project")
		if project == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "project query param is required"})
			return
		}

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("ws upgrade failed: %v", err)
			return
		}

		cl := &client{conn: conn, project: project, send: make(chan RoomState, 8)}
		h.mu.Lock()
		h.clients[cl] = true
		h.mu.Unlock()

		defer func() {
			h.mu.Lock()
			delete(h.clients, cl)
			h.mu.Unlock()
			conn.Close()
		}()

		if snapshot, ok := store.Snapshot(project); ok {
			if err := conn.WriteJSON(snapshot); err != nil {
				return
			}
		}

		go func() {
			for room := range cl.send {
				if err := conn.WriteJSON(room); err != nil {
					return
				}
			}
		}()

		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				close(cl.send)
				return
			}
		}
	}
}
