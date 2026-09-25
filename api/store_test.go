package main

import (
	"testing"
	"time"
)

func TestIsIdle(t *testing.T) {
	now := time.Date(2026, 9, 25, 12, 0, 0, 0, time.UTC)
	threshold := 45 * time.Second

	cases := []struct {
		name        string
		lastEventAt time.Time
		want        bool
	}{
		{"just happened", now.Add(-1 * time.Second), false},
		{"exactly at threshold", now.Add(-45 * time.Second), true},
		{"long idle", now.Add(-5 * time.Minute), true},
		{"future timestamp (clock skew)", now.Add(10 * time.Second), false},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := IsIdle(c.lastEventAt, now, threshold)
			if got != c.want {
				t.Errorf("IsIdle(%v, %v, %v) = %v, want %v", c.lastEventAt, now, threshold, got, c.want)
			}
		})
	}
}
