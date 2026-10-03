package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCORSHeaderAllowsFrontendOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	store := NewStore()
	hub := NewHub()
	r := newRouter(store, hub)

	req := httptest.NewRequest(http.MethodGet, "/rooms", nil)
	req.Header.Set("Origin", frontendOrigin)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	got := w.Header().Get("Access-Control-Allow-Origin")
	if got != frontendOrigin {
		t.Errorf("expected Access-Control-Allow-Origin %q, got %q", frontendOrigin, got)
	}
}

func TestRoomsSnapshot_UnicodeProjectQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)
	store := NewStore()
	hub := NewHub()
	r := newRouter(store, hub)

	project := "/tmp/proyek keren äöü/日本語 a+b&c"

	// POST an event for this project first (through the real router, same
	// query/body encoding path a hook script would use).
	body := `{"project":` + jsonString(project) + `,"subagent_type":"dev","summary":"ok"}`
	postReq := httptest.NewRequest(http.MethodPost, "/events", strings.NewReader(body))
	postReq.Header.Set("Content-Type", "application/json")
	postW := httptest.NewRecorder()
	r.ServeHTTP(postW, postReq)
	if postW.Code != 204 {
		t.Fatalf("expected 204 from POST /events, got %d: %s", postW.Code, postW.Body.String())
	}

	// GET the snapshot using the same URL-encoding a browser's
	// encodeURIComponent would produce.
	getURL := "/rooms/snapshot?project=" + url.QueryEscape(project)
	getReq := httptest.NewRequest(http.MethodGet, getURL, nil)
	getW := httptest.NewRecorder()
	r.ServeHTTP(getW, getReq)

	if getW.Code != 200 {
		t.Fatalf("expected 200 from GET /rooms/snapshot, got %d: %s", getW.Code, getW.Body.String())
	}

	var room RoomState
	if err := json.Unmarshal(getW.Body.Bytes(), &room); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if room.Project != project {
		t.Errorf("expected project %q, got %q", project, room.Project)
	}
}

func jsonString(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}

func TestPostEvents_UnknownAgentIs400(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := newRouter(NewStore(), NewHub())

	req := httptest.NewRequest(http.MethodPost, "/events", strings.NewReader(`{"project":"/p","subagent_type":"lead","agent":"gemini"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 400 {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

// A rejected event must leave no trace: no room, no roadmap watcher. The project
// dir has a parseable ROADMAP.md, so a watcher started too early would create the room.
func TestPostEvents_UnknownAgentDoesNotCreateRoom(t *testing.T) {
	gin.SetMode(gin.TestMode)
	store := NewStore()
	r := newRouter(store, NewHub())

	project := t.TempDir()
	if err := os.WriteFile(filepath.Join(project, "ROADMAP.md"), []byte("## M01: Fondasi\nProgress: 40%\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	body := `{"project":` + strconv.Quote(project) + `,"subagent_type":"lead","agent":"gemini"}`
	req := httptest.NewRequest(http.MethodPost, "/events", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 400 {
		t.Fatalf("expected 400, got %d", w.Code)
	}
	if _, ok := store.Snapshot(project); ok {
		t.Error("rejected event created a room via the roadmap watcher")
	}
}
