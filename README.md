# CEO Tokens Optimizer

Claude Code plugin for token-efficient work on CEO-dashboard, analytics, and presentation tasks.

The plugin is intentionally small and original. It does not bundle third-party proprietary code.

## Privacy and Access

This plugin works without accounts, login flows, payments, subscriptions, license checks, or remote entitlement checks.

It does not send usage data to external services. The current implementation has no network calls, analytics SDKs, telemetry endpoints, or hosted backend dependency.

## Install

Inside Claude Code:

```text
/plugin marketplace add romanbelopolskiy/ceo-tokens-optimizer
/plugin install ceo-tokens-optimizer@ceo-tokens-marketplace
```

Restart Claude Code after installation.

## What It Adds

- `ceo-tokens-optimizer:advisor` agent for scoped analytical and coding work.
- `token-budget` skill for reducing repeated reads, oversized outputs, and redundant summaries.
- Session context that reminds Claude to keep CEO-dashboard deliverables concise and file-based.

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
