package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/fsnotify/fsnotify"
)

// WatchRoadmap starts a background watcher on <project>/ROADMAP.md.
// Safe to call multiple times for the same project; callers should
// track which projects are already watched (see main.go) to avoid
// spawning duplicate watchers.
func WatchRoadmap(store *Store, hub *Hub, project string) error {
	roadmapPath := filepath.Join(project, "ROADMAP.md")

	loadAndBroadcast := func() {
		content, err := os.ReadFile(roadmapPath)
		if err != nil {
			return
		}
		data, err := ParseRoadmap(string(content))
		if err != nil {
			log.Printf("failed to parse %s: %v", roadmapPath, err)
			return
		}
		room := store.UpdateRoadmap(project, data)
		hub.BroadcastRoom(room)
	}

	loadAndBroadcast()

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	if err := watcher.Add(project); err != nil {
		watcher.Close()
		return err
	}

	go func() {
		defer watcher.Close()
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				if filepath.Base(event.Name) == "ROADMAP.md" {
					loadAndBroadcast()
				}
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				log.Printf("watcher error for %s: %v", project, err)
			}
		}
	}()

	return nil
}
