#!/usr/bin/env node
'use strict';
/*
 * CEO Tokens Optimizer — compact search MCP server.
 *
 * Dependency-free, original, local-only. No network, no telemetry.
 * Speaks the MCP stdio transport (newline-delimited JSON-RPC 2.0) by hand so
 * the plugin keeps zero npm dependencies.
 *
 * Tools:
 *   - Search:    file discovery + grep in one call; returns capped
 *                path:line:snippet matches instead of whole files.
 *   - ReadSlice: read only a numbered line range of a file.
 *
 * The point is token economy: return excerpts, never dump whole files.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');

const SERVER_INFO = { name: 'ceo-tokens-optimizer-search', version: '0.2.0' };
const MAX_BUFFER = 8 * 1024 * 1024;
const SNIPPET_MAX = 240;

function send(msg) { process.stdout.write(JSON.stringify(msg) + '\n'); }
function ok(id, res) { send({ jsonrpc: '2.0', id, result: res }); }
function err(id, code, message) { send({ jsonrpc: '2.0', id, error: { code, message } }); }
function toolText(id, text, isError) {
  send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: String(text) }], isError: !!isError } });
}

function clamp(s) { return s.length > SNIPPET_MAX ? s.slice(0, SNIPPET_MAX) + ' …' : s; }

function runSearch(args) {
  const pattern = args.pattern;
  if (!pattern || typeof pattern !== 'string') return { text: 'Error: "pattern" is required.', isError: true };
  const where = (args.path && typeof args.path === 'string') ? args.path : '.';
  const maxResults = Number.isFinite(args.max_results) ? Math.max(1, Math.min(500, args.max_results)) : 60;
  const context = Number.isFinite(args.context) ? Math.max(0, Math.min(10, args.context)) : 0;
  const ic = !!args.ignore_case;
  const glob = (args.glob && typeof args.glob === 'string') ? args.glob : null;

  const rgArgs = ['--line-number', '--no-heading', '--color', 'never', '--max-columns', '400'];
  if (ic) rgArgs.push('-i');
  if (context > 0) rgArgs.push('-C', String(context));
  if (glob) rgArgs.push('-g', glob);
  rgArgs.push('-e', pattern, where);

  let used = 'rg';
  let r = spawnSync('rg', rgArgs, { encoding: 'utf8', maxBuffer: MAX_BUFFER });
  if (r.error && r.error.code === 'ENOENT') {
    const g = ['-rn'];
    if (ic) g.push('-i');
    if (context > 0) g.push('-C', String(context));
    if (glob) g.push('--include', glob);
    g.push('-e', pattern, where);
    used = 'grep';
    r = spawnSync('grep', g, { encoding: 'utf8', maxBuffer: MAX_BUFFER });
  }
  if (r.error) return { text: 'Error running search: ' + r.error.message, isError: true };

  const stdout = r.stdout || '';
  if (stdout.trim() === '' && r.status === 1) {
    return { text: 'No matches for /' + pattern + '/ in ' + where, isError: false };
  }
  if (r.status && r.status > 1 && stdout.trim() === '') {
    return { text: 'Search failed (' + used + ' exit ' + r.status + '): ' + (r.stderr || '').slice(0, 400), isError: true };
  }
  const lines = stdout.split('\n').filter(Boolean);
  const total = lines.length;
  let text = lines.slice(0, maxResults).map(clamp).join('\n');
  if (total > maxResults) text += '\n… ' + (total - maxResults) + ' more match lines (raise max_results or narrow the pattern).';
  text += '\n[' + used + ': showing ' + Math.min(total, maxResults) + ' of ' + total + ' match lines]';
  return { text, isError: false };
}

function runReadSlice(args) {
  const file = args.file;
  if (!file || typeof file !== 'string') return { text: 'Error: "file" is required.', isError: true };
  let content;
  try { content = fs.readFileSync(file, 'utf8'); }
  catch (e) { return { text: 'Error reading ' + file + ': ' + e.message, isError: true }; }
  const all = content.split('\n');
  const start = Number.isFinite(args.start) ? Math.max(1, Math.floor(args.start)) : 1;
  const maxLines = Number.isFinite(args.max_lines) ? Math.max(1, Math.min(2000, args.max_lines)) : 200;
  let end = Number.isFinite(args.end) ? Math.min(all.length, Math.floor(args.end)) : all.length;
  if (end < start) end = start;
  if (end - start + 1 > maxLines) end = start + maxLines - 1;
  const slice = all.slice(start - 1, end);
  const width = String(end).length;
  const body = slice.map((l, i) => String(start + i).padStart(width, ' ') + '  ' + clamp(l)).join('\n');
  return { text: file + '  lines ' + start + '-' + end + ' of ' + all.length + '\n' + body, isError: false };
}

const TOOLS = [
  {
    name: 'Search',
    description: 'Compact code/text search. Combines file discovery + grep and returns only capped path:line:snippet matches, never whole files. Prefer over Grep/Glob/whole-file reads. Uses ripgrep when available, else grep.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regex or literal to search for.' },
        path: { type: 'string', description: 'File or directory to search (default: current dir).' },
        glob: { type: 'string', description: 'Optional filename filter, e.g. "*.ts".' },
        context: { type: 'number', description: 'Context lines around each match (0-10, default 0).' },
        ignore_case: { type: 'boolean', description: 'Case-insensitive match.' },
        max_results: { type: 'number', description: 'Max match lines returned (default 60, max 500).' }
      },
      required: ['pattern']
    }
  },
  {
    name: 'ReadSlice',
    description: 'Read only a numbered line range of a file instead of the whole file. Use to inspect a known region cheaply.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to the file.' },
        start: { type: 'number', description: '1-based start line (default 1).' },
        end: { type: 'number', description: 'Inclusive end line (default end of file, capped by max_lines).' },
        max_lines: { type: 'number', description: 'Max lines returned (default 200, max 2000).' }
      },
      required: ['file']
    }
  }
];

function handle(req) {
  if (!req || typeof req !== 'object') return;
  const { id, method, params } = req;
  if (method === 'initialize') {
    const pv = (params && params.protocolVersion) || '2025-06-18';
    return ok(id, { protocolVersion: pv, capabilities: { tools: {} }, serverInfo: SERVER_INFO });
  }
  if (method === 'tools/list') return ok(id, { tools: TOOLS });
  if (method === 'ping') return ok(id, {});
  if (method === 'tools/call') {
    const name = params && params.name;
    const a = (params && params.arguments) || {};
    try {
      if (name === 'Search') { const o = runSearch(a); return toolText(id, o.text, o.isError); }
      if (name === 'ReadSlice') { const o = runReadSlice(a); return toolText(id, o.text, o.isError); }
      return err(id, -32602, 'Unknown tool: ' + name);
    } catch (e) {
      return toolText(id, 'Tool error: ' + e.message, true);
    }
  }
  // Notifications (no id) are ignored. Unknown method with an id -> not found.
  if (id !== undefined && id !== null) return err(id, -32601, 'Method not found: ' + method);
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let req;
    try { req = JSON.parse(line); } catch (e) { continue; }
    if (Array.isArray(req)) req.forEach(handle); else handle(req);
  }
});
process.stdin.on('end', () => process.exit(0));
