---
name: token-budget
description: Use for large CEO-dashboard, data-analysis, presentation, or repo tasks where context and output size must stay controlled.
---

# Token Budget Workflow

Use this workflow before large tasks.

1. State the shortest useful plan.
2. Read file lists and schemas before reading file bodies.
3. Prefer the plugin's `Search`/`ReadSlice` tools (compact matches and ranged reads, or `rg`), targeted SQL, and existing MCP tools over whole-file reads.
4. Keep terminal output capped unless the raw output is the deliverable.
5. Store long analysis in the requested file instead of pasting it into chat.
6. Final response should include only outcome, path, and verification.

For executive deliverables:
- One insight per section or slide.
- Each insight must connect to revenue growth, loss prevention, or operating control.
- Avoid dense methodology unless it changes a decision.
