package main

import (
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// TestHub_BroadcastAfterClientDisconnect_NoPanic reproduces the reviewer's
// finding: BroadcastRoom sends on cl.send while another goroutine (the read
// loop's error path) closes that same channel outside the hub's lock,
// causing "send on closed channel" panics under concurrent connect/disconnect.
func TestHub_BroadcastAfterClientDisconnect_NoPanic(t *testing.T) {
	gin.SetMode(gin.TestMode)
	store := NewStore()
	hub := NewHub()
	r := gin.New()
	r.GET("/ws", hub.ServeWS(store))
	srv := httptest.NewServer(r)
	defer srv.Close()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws?project=/tmp/racetest-ws"

	stop := make(chan struct{})
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		room := &RoomState{Project: "/tmp/racetest-ws", Agents: map[string]*AgentState{}, Feed: []Event{}}
		for {
			select {
			case <-stop:
				return
			default:
				hub.BroadcastRoom(room)
			}
		}
	}()

	for i := 0; i < 50; i++ {
		conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("dial %d failed: %v", i, err)
		}
		conn.Close()
	}

	time.Sleep(100 * time.Millisecond) // let in-flight ReadMessage error paths run
	close(stop)
	wg.Wait()
	// Reaching here without a panic (crashed test binary) is the pass condition.
}
