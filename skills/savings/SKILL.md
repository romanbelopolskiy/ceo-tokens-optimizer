---
name: savings
description: Show this plugin's local token-usage stats — tool calls, compact-tool share (Search/ReadSlice vs Read/Grep/Glob), and estimated tool-output tokens for the current session and lifetime. Local only, no network. TRIGGER on /savings or when asked how token-efficient the session has been.
allowed-tools: Bash(node *)
---

# Savings Report

Run the local report and relay its output verbatim — do not summarize or modify it:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/savings-report.js"
```

All data is read from `~/.ceo-tokens-optimizer/stats.json`, written locally by the
plugin's PostToolUse hook. Nothing is sent anywhere. A higher compact share means
the session leaned on `Search` / `ReadSlice` instead of dumping whole files.
