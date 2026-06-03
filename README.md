# CEO Tokens Optimizer

Claude Code plugin for token-efficient work on CEO-dashboard, analytics, and presentation tasks.

The plugin is intentionally small and original. It does not bundle third-party proprietary code and has no npm dependencies.

## Privacy and Access

This plugin works without accounts, login flows, payments, subscriptions, license checks, or remote entitlement checks.

It makes no network calls and has no analytics SDKs, telemetry endpoints, or hosted backend. Usage stats (for `/savings` and the status line) are written only to a local file at `~/.ceo-tokens-optimizer/stats.json` and never leave your machine.

## Install

Inside Claude Code:

```text
/plugin marketplace add romanbelopolskiy/ceo-tokens-optimizer
/plugin install ceo-tokens-optimizer@ceo-tokens-marketplace
```

Restart Claude Code after installation.

## What It Adds

- **Compact search tools (MCP):** `Search` returns capped `path:line:snippet` matches instead of dumping whole files, and `ReadSlice` reads only a line range. Fewer tokens per lookup.
- **`ceo-tokens-optimizer:advisor` agent** for scoped analytical and coding work. `Grep`/`Glob` are disabled for this agent so it leans on `Search`.
- **`token-budget` skill** for reducing repeated reads, oversized outputs, and redundant summaries.
- **Batching guidance** injected at session start: prefer one combined `Search` call and one batched `Edit` call over many small round-trips.
- **Local usage stats:** a `PostToolUse` hook records tool calls and the compact-tool share. See them with `/savings`.
- **Rate-limit HUD:** the default status line shows 5h / weekly / session limit use and context fill.

## Tools

| Tool | What it does |
|------|--------------|
| `Search` | File discovery + grep in one call; capped match lines, not whole files. Uses ripgrep if present, else grep. |
| `ReadSlice` | Reads only a numbered line range of a file. |

## Status line and savings

The default status line is the rate-limit HUD (`scripts/hud-with-ctx.sh`): 5h / weekly / session limit use and context fill.

Token-usage savings are tracked separately and surfaced with **`/savings`** — a local report of tool calls, the compact-tool share (`Search`/`ReadSlice` vs `Read`/`Grep`/`Glob`), and estimated tool-output tokens, for the session and lifetime.

Prefer the savings line in your status bar instead of the HUD? Point `statusLine` in `~/.claude/settings.json` at the bundled script:

```json
"statusLine": { "type": "command", "command": "node /path/to/ceo-tokens-optimizer/scripts/status-line.js" }
```

## Usage

Launch explicitly when needed:

```bash
claude --agent ceo-tokens-optimizer:advisor
```

Or ask Claude to use the `token-budget` skill before a large research, dashboard, or deck task.

## Update

```bash
claude plugin marketplace update ceo-tokens-marketplace
claude plugin update ceo-tokens-optimizer@ceo-tokens-marketplace
```
