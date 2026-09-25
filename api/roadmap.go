package main

import (
	"regexp"
	"strconv"
	"strings"
)

var (
	moduleHeadingRe = regexp.MustCompile(`(?m)^##\s+(.+?)\s*$`)
	progressRe      = regexp.MustCompile(`(?m)^Progress:\s*(-?\d+)%\s*$`)
)

// ParseRoadmap parses a ROADMAP.md convention: each "## Title" section
// optionally followed (before the next "## ") by a "Progress: N%" line.
// Modules without a valid Progress line are skipped, not errored.
// Malformed content (no headings at all) returns an empty, non-nil result.
func ParseRoadmap(content string) (*RoadmapData, error) {
	headingMatches := moduleHeadingRe.FindAllStringSubmatchIndex(content, -1)
	data := &RoadmapData{Modules: []RoadmapModule{}}

	for i, m := range headingMatches {
		title := strings.TrimSpace(content[m[2]:m[3]])
		sectionStart := m[1]
		sectionEnd := len(content)
		if i+1 < len(headingMatches) {
			sectionEnd = headingMatches[i+1][0]
		}
		section := content[sectionStart:sectionEnd]

		pm := progressRe.FindStringSubmatch(section)
		if pm == nil {
			continue
		}
		progress, err := strconv.Atoi(pm[1])
		if err != nil {
			continue
		}
		if progress < 0 {
			progress = 0
		}
		if progress > 100 {
			progress = 100
		}

		data.Modules = append(data.Modules, RoadmapModule{Title: title, Progress: progress})
	}

	return data, nil
}
