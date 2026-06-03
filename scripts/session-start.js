const payload = {
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext:
      "CEO Tokens Optimizer active. Keep work scoped: prefer narrow, targeted reads over broad dumps. Use the plugin's Search tool (compact match lines) instead of grep/glob or whole-file reads, and ReadSlice to read only a line range of large files. Batch related searches into one Search call and multiple edits into one Edit call. Write long deliverables to files and summarize only the decisions, changed files, and verification.",
  },
};

console.log(JSON.stringify(payload));
