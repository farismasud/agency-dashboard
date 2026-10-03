#!/usr/bin/env bash
# Reports which tools have the agency hook registered and prints the snippet for the
# ones that do not. Read-only: this script never edits your config files.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"

report() { # report <label> <file> <needle> <snippet>
  if [ -f "$2" ] && grep -q "$3" "$2"; then echo "ok       $1  ($2)"; else
    echo "MISSING  $1  ($2)"; printf '%s\n' "$4" | sed 's/^/           /'
  fi
}

report "claude" "$HOME/.claude/settings.json" "agency-notify.sh" \
  "add $DIR/agency-notify.sh to PreToolUse (*), SubagentStart and SubagentStop in hooks"

report "hermes" "$HOME/.hermes/config.yaml" "agency-notify-hermes.sh" \
"hooks:
  pre_tool_call:
    - matcher: \"terminal|execute_code|read_file|write_file|patch|search_files\"
      command: \"$DIR/agency-notify-hermes.sh\"
  on_session_end:
    - command: \"$DIR/agency-notify-hermes.sh\""

report "codex" "$HOME/.codex/hooks.json" "agency-notify-codex.sh" \
"{\"hooks\":{\"PreToolUse\":[{\"matcher\":\".*\",\"hooks\":[{\"type\":\"command\",\"command\":\"$DIR/agency-notify-codex.sh\"}]}]}}
(file location is inferred: confirm it is where Codex reads user-level hooks, then approve trust on first run)"

report "agy" "$HOME/.gemini/antigravity-cli/plugins/agency-notify/hooks.json" "agency-notify-agy.sh" \
"b=\$(mktemp -d) && cp $DIR/agy-plugin/plugin.json \$b/ && sed \"s#@HOOKS_DIR@#$DIR#g\" $DIR/agy-plugin/hooks.json.in > \$b/hooks.json && agy plugin install \$b"
