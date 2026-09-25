package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
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
