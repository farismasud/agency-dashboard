package main

import "testing"

func TestParseRoadmap_Basic(t *testing.T) {
	content := "# Roadmap\n\n## M01: Fondasi data\nProgress: 40%\n\n## M02: Keamanan\nProgress: 0%\n"
	data, err := ParseRoadmap(content)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(data.Modules) != 2 {
		t.Fatalf("expected 2 modules, got %d", len(data.Modules))
	}
	if data.Modules[0].Title != "M01: Fondasi data" || data.Modules[0].Progress != 40 {
		t.Errorf("unexpected module 0: %+v", data.Modules[0])
	}
	if data.Modules[1].Title != "M02: Keamanan" || data.Modules[1].Progress != 0 {
		t.Errorf("unexpected module 1: %+v", data.Modules[1])
	}
}

func TestParseRoadmap_EmptyContent_ReturnsEmptyNotError(t *testing.T) {
	data, err := ParseRoadmap("")
	if err != nil {
		t.Fatalf("expected no error for empty content, got %v", err)
	}
	if len(data.Modules) != 0 {
		t.Errorf("expected 0 modules, got %d", len(data.Modules))
	}
}

func TestParseRoadmap_ModuleWithoutProgress_Skipped(t *testing.T) {
	content := "## M01: No progress line here\n\n## M02: Has progress\nProgress: 50%\n"
	data, err := ParseRoadmap(content)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(data.Modules) != 1 {
		t.Fatalf("expected 1 module (the one with valid progress), got %d: %+v", len(data.Modules), data.Modules)
	}
	if data.Modules[0].Title != "M02: Has progress" {
		t.Errorf("unexpected surviving module: %+v", data.Modules[0])
	}
}

func TestParseRoadmap_OutOfRangeProgress_Clamped(t *testing.T) {
	content := "## M01: Over\nProgress: 150%\n\n## M02: Negative\nProgress: -10%\n"
	data, err := ParseRoadmap(content)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if data.Modules[0].Progress != 100 {
		t.Errorf("expected clamp to 100, got %d", data.Modules[0].Progress)
	}
	if data.Modules[1].Progress != 0 {
		t.Errorf("expected clamp to 0, got %d", data.Modules[1].Progress)
	}
}
