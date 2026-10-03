#!/usr/bin/env bash
# agy hook adapter: agy plugin hooks use Claude-style payloads, so reuse the Claude
# adapter and only change who the event belongs to. MUST NEVER block agy: always exit 0.
# Forced (not defaulted) so a stray AGENCY_AGENT in the environment cannot relabel agy.
export AGENCY_AGENT=agy
exec "$(dirname "$(readlink -f "$0")")/agency-notify.sh"
