# Changelog

All notable changes to the CEO Tokens Optimizer plugin. Versions track
`.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.

## 0.2.1 — 2026-06-03
- HUD: the rate-limit status line (`scripts/hud-with-ctx.sh`) now appends a compact
  savings segment `sv:N% ~Nk` — session compact-tool share (Search/ReadSlice vs
  Read/Grep/Glob) plus estimated tool-output tokens — read from the local stats
  file. Omitted when the session has no stats.

## 0.2.0 — 2026-06-03
- Compact search MCP server (`servers/search-server.js`, dependency-free, local):
  `Search` (capped `path:line:snippet`, ripgrep→grep fallback) and `ReadSlice`
  (numbered line range), wired via `.mcp.json` (`alwaysLoad`).
- `advisor` agent disables `Grep`/`Glob` so it leans on `Search`.
- Batching guidance injected at session start and in the advisor prompt.
- Local usage stats: a `PostToolUse` hook (`scripts/savings-track.js`) records tool
  calls and the compact-tool share to `~/.ceo-tokens-optimizer/stats.json`, surfaced
  via the `/savings` skill (`scripts/savings-report.js`) and an optional savings
  status line (`scripts/status-line.js`). No network, no telemetry.

## 0.1.1 — 2026-06-03
- Rate-limit HUD status line (`scripts/hud-with-ctx.sh`): 5h / weekly / session
  limit use and context fill; sets the Claude `statusLine` type.

## 0.1.0
- Initial plugin scaffold: `advisor` agent, `token-budget` skill, and a
  session-start context hook. No accounts, network calls, telemetry, or auth.
