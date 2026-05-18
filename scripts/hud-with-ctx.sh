#!/usr/bin/env bash
set -euo pipefail

# Claude Code statusLine command.
# Reads the statusLine JSON payload from stdin and prints a compact HUD:
#   5h:N%(reset) wk:N%(reset) sn:N%(reset) · ctx:N%
# It also writes ~/.claude/state/hud/<cwd_basename>.json for bridge/auto-compact consumers.

payload_file=$(mktemp "${TMPDIR:-/tmp}/claude-hud-payload.XXXXXX")
trap 'rm -f "$payload_file"' EXIT
cat >"$payload_file"

python3 - "$payload_file" "$@" <<'PY'
import json
import math
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

payload_path = sys.argv[1] if len(sys.argv) > 1 else ""
try:
    raw = Path(payload_path).read_text() if payload_path else ""
except Exception:
    raw = ""
try:
    payload = json.loads(raw) if raw.strip() else {}
except Exception:
    payload = {}

# Claude/OMC sometimes caches the last HUD payload in the project dir. Use it only
# when statusLine stdin is empty/incomplete.
def load_cache(cwd: str) -> dict:
    if not cwd:
        return {}
    p = Path(cwd) / ".omc" / "state" / "hud-stdin-cache.json"
    try:
        if p.exists():
            return json.loads(p.read_text())
    except Exception:
        return {}
    return {}

cwd = (
    payload.get("cwd")
    or payload.get("workspace", {}).get("current_dir")
    or payload.get("workspace", {}).get("project_dir")
    or os.getcwd()
)
cache = load_cache(cwd)
if not payload.get("rate_limits") and cache.get("rate_limits"):
    payload.setdefault("rate_limits", cache.get("rate_limits"))
if not payload.get("context_window") and cache.get("context_window"):
    payload.setdefault("context_window", cache.get("context_window"))
if not payload.get("transcript_path") and cache.get("transcript_path"):
    payload.setdefault("transcript_path", cache.get("transcript_path"))

cwd = (
    payload.get("cwd")
    or payload.get("workspace", {}).get("current_dir")
    or payload.get("workspace", {}).get("project_dir")
    or cwd
)
bot = os.path.basename(cwd.rstrip("/")) or "unknown"


def pct(v):
    if v is None:
        return None
    try:
        x = float(v)
        if math.isnan(x) or math.isinf(x):
            return None
        return max(0, min(999, int(round(x))))
    except Exception:
        return None


def dur_until(ts):
    if ts is None:
        return ""
    try:
        # Claude payloads have used epoch seconds.
        sec = int(float(ts) - time.time())
    except Exception:
        return ""
    if sec <= 0:
        return "(now)"
    d, rem = divmod(sec, 86400)
    h, rem = divmod(rem, 3600)
    m, _ = divmod(rem, 60)
    if d:
        return f"({d}d{h}h)"
    if h:
        return f"({h}h{m:02d}m)"
    return f"({m}m)"


def find_limit(rate_limits, names):
    if not isinstance(rate_limits, dict):
        return None, None
    lower = {str(k).lower(): v for k, v in rate_limits.items()}
    for name in names:
        v = lower.get(name.lower())
        if isinstance(v, dict):
            return pct(v.get("used_percentage") or v.get("usage_percentage") or v.get("percent") or v.get("used")), (
                v.get("resets_at") or v.get("reset_at") or v.get("reset_time")
            )
        if v is not None:
            return pct(v), None
    # Fuzzy fallback.
    for k, v in lower.items():
        if any(n.lower() in k for n in names) and isinstance(v, dict):
            return pct(v.get("used_percentage") or v.get("usage_percentage") or v.get("percent") or v.get("used")), (
                v.get("resets_at") or v.get("reset_at") or v.get("reset_time")
            )
    return None, None

rate_limits = payload.get("rate_limits") or {}
five, five_reset = find_limit(rate_limits, ["five_hour", "5h", "fiveHour"])
week, week_reset = find_limit(rate_limits, ["seven_day", "weekly", "week", "7d", "wk"])
sonnet, sonnet_reset = find_limit(rate_limits, ["sonnet", "sonnet_hour", "sonnet_5h", "sn"])

cw = payload.get("context_window") or {}
ctx = pct(cw.get("used_percentage"))
if ctx is None:
    current = cw.get("current_usage") or {}
    size = cw.get("context_window_size") or 200000
    try:
        used = sum(float(current.get(k) or 0) for k in [
            "input_tokens",
            "output_tokens",
            "cache_creation_input_tokens",
            "cache_read_input_tokens",
        ])
        ctx = pct(used * 100.0 / float(size)) if size else None
    except Exception:
        ctx = None

# Last-resort transcript fallback for ctx.
if ctx is None and payload.get("transcript_path"):
    try:
        last = None
        with open(payload["transcript_path"], "rb") as f:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            f.seek(max(0, size - 512 * 1024))
            for line in f.read().splitlines():
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                if obj.get("type") == "assistant" or obj.get("message", {}).get("role") == "assistant":
                    last = obj
        usage = (last or {}).get("message", {}).get("usage", {}) or (last or {}).get("usage", {})
        used = sum(float(usage.get(k) or 0) for k in [
            "input_tokens",
            "output_tokens",
            "cache_creation_input_tokens",
            "cache_read_input_tokens",
        ])
        size = cw.get("context_window_size") or 200000
        ctx = pct(used * 100.0 / float(size)) if size else None
    except Exception:
        pass

home = Path.home()
state_dir = home / ".claude" / "state" / "hud"
try:
    state_dir.mkdir(parents=True, exist_ok=True)
    (state_dir / f"{bot}.json").write_text(json.dumps({
        "ctx": ctx,
        "ts": datetime.now(timezone.utc).isoformat(),
        "cwd": cwd,
        "bot": bot,
        "rate_limits": rate_limits,
    }, ensure_ascii=False))
except Exception:
    pass


def part(label, value, reset=None):
    if value is None:
        return f"{label}:?"
    return f"{label}:{value}%{dur_until(reset)}"

print(f"{part('5h', five, five_reset)} {part('wk', week, week_reset)} {part('sn', sonnet, sonnet_reset)} · ctx:{ctx if ctx is not None else '?'}%")
PY
