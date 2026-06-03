#!/usr/bin/env node
'use strict';
/*
 * CEO Tokens Optimizer — PostToolUse stat tracker.
 *
 * Accumulates local-only usage counters so /savings and the status line can
 * show whether the session is leaning on compact tools. No network, no
 * telemetry: everything is written to ~/.ceo-tokens-optimizer/stats.json.
 * Never throws and always exits 0 so it can never break a session.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const HEAVY = new Set(['Read', 'Grep', 'Glob']);
function isCompact(tool) { return /(^|_)Search$|(^|_)ReadSlice$/.test(tool); }

function blank(started) { return { started: started || 0, calls: 0, compact: 0, heavy: 0, outChars: 0, byTool: {} }; }

function bump(s, tool, outChars) {
  s.calls++;
  s.outChars += outChars;
  s.byTool[tool] = (s.byTool[tool] || 0) + 1;
  if (isCompact(tool)) s.compact++;
  else if (HEAVY.has(tool)) s.heavy++;
}

function main(input) {
  let data;
  try { data = JSON.parse(input || '{}'); } catch (e) { return; }
  const session = data.session_id || 'unknown';
  const tool = data.tool_name || 'unknown';
  let outChars = 0;
  try { outChars = JSON.stringify(data.tool_response == null ? '' : data.tool_response).length; } catch (e) { outChars = 0; }

  const dir = path.join(os.homedir(), '.ceo-tokens-optimizer');
  const file = path.join(dir, 'stats.json');

  let stats;
  try { stats = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { stats = null; }
  if (!stats || typeof stats !== 'object') stats = { lifetime: blank(), sessions: {} };
  if (!stats.lifetime) stats.lifetime = blank();
  if (!stats.sessions) stats.sessions = {};
  if (!stats.sessions[session]) stats.sessions[session] = blank(Date.now());

  bump(stats.lifetime, tool, outChars);
  bump(stats.sessions[session], tool, outChars);
  stats.sessions[session].updated = Date.now();

  // Keep the per-session map bounded to the 50 most recent sessions.
  const keys = Object.keys(stats.sessions);
  if (keys.length > 50) {
    keys.sort((a, b) => (stats.sessions[a].started || 0) - (stats.sessions[b].started || 0));
    for (const k of keys.slice(0, keys.length - 50)) delete stats.sessions[k];
  }

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(stats));
  } catch (e) { /* best effort */ }
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (e) { /* never break the session */ } process.exit(0); });
