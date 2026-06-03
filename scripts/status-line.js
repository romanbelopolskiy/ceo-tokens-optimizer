#!/usr/bin/env node
'use strict';
/*
 * CEO Tokens Optimizer — status line.
 *
 * Prints one compact line: session + lifetime tool-call counts, the share of
 * calls that used compact tools (Search / ReadSlice), and an estimate of
 * tool-output tokens (~chars/4). Local only. Never throws.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

function k(n) { return Math.round((n || 0) / 1000); }
function compactPct(s) {
  const den = (s.compact || 0) + (s.heavy || 0);
  return den ? Math.round((100 * (s.compact || 0)) / den) : 0;
}
function tokK(s) { return k((s.outChars || 0) / 4); }

function render(input) {
  let d = {};
  try { d = JSON.parse(input || '{}'); } catch (e) { d = {}; }
  const session = d.session_id || '';
  const file = path.join(os.homedir(), '.ceo-tokens-optimizer', 'stats.json');

  let stats = null;
  try { stats = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { stats = null; }
  if (!stats) { process.stdout.write('⚡CTO  no data yet'); return; }

  const L = stats.lifetime || { calls: 0, compact: 0, heavy: 0, outChars: 0 };
  const s = (stats.sessions && stats.sessions[session]) || null;
  const sPart = s
    ? 'S ' + s.calls + 'c · ' + compactPct(s) + '% cmp · ~' + tokK(s) + 'k'
    : 'S –';
  const lPart = 'L ' + L.calls + 'c · ~' + tokK(L) + 'k';
  process.stdout.write('⚡CTO  ' + sPart + '  |  ' + lPart);
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => { try { render(input); } catch (e) { process.stdout.write('⚡CTO'); } process.exit(0); });
// If no stdin arrives (manual run), still print something.
setTimeout(() => { try { render(input); } catch (e) { process.stdout.write('⚡CTO'); } process.exit(0); }, 250);
