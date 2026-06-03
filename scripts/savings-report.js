#!/usr/bin/env node
'use strict';
/*
 * CEO Tokens Optimizer — savings report (/savings skill).
 *
 * Prints local usage stats: lifetime + the most recent sessions, with the
 * compact-tool share and an estimate of tool-output tokens (~chars/4).
 * Honest framing: this measures how often compact tools were used, not a
 * claimed dollar figure. Local only, no network.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

function k(n) { return Math.round((n || 0) / 1000); }
function compactPct(s) {
  const den = (s.compact || 0) + (s.heavy || 0);
  return den ? Math.round((100 * (s.compact || 0)) / den) : 0;
}
function topTools(byTool, n) {
  return Object.entries(byTool || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([t, c]) => '    ' + c + '×  ' + t)
    .join('\n');
}
function block(title, s) {
  const lines = [];
  lines.push(title);
  lines.push('  calls: ' + (s.calls || 0) +
    '   compact: ' + (s.compact || 0) +
    '   heavy(Read/Grep/Glob): ' + (s.heavy || 0) +
    '   compact share: ' + compactPct(s) + '%');
  lines.push('  est. tool-output tokens: ~' + k((s.outChars || 0) / 4) + 'k');
  if (s.byTool && Object.keys(s.byTool).length) {
    lines.push('  top tools:');
    lines.push(topTools(s.byTool, 6));
  }
  return lines.join('\n');
}

const file = path.join(os.homedir(), '.ceo-tokens-optimizer', 'stats.json');
let stats = null;
try { stats = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { stats = null; }

if (!stats) {
  console.log('CEO Tokens Optimizer — no stats yet.');
  console.log('Stats accumulate locally at ~/.ceo-tokens-optimizer/stats.json after tool use.');
  process.exit(0);
}

console.log('CEO Tokens Optimizer — savings report');
console.log('(local only · ~/.ceo-tokens-optimizer/stats.json · no data leaves this machine)');
console.log('');
console.log(block('LIFETIME', stats.lifetime || {}));

const sessions = Object.entries(stats.sessions || {})
  .sort((a, b) => (b[1].updated || b[1].started || 0) - (a[1].updated || a[1].started || 0))
  .slice(0, 3);

if (sessions.length) {
  console.log('');
  console.log('RECENT SESSIONS');
  for (const [id, s] of sessions) {
    console.log('');
    console.log(block('  session ' + id.slice(0, 8), s));
  }
}
console.log('');
console.log('Higher compact share = more Search/ReadSlice, fewer whole-file reads.');
