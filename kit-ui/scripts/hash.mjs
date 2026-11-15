#!/usr/bin/env node
// kit-ui: print the hash of a file the way the Figma scripts compute it (FNV-1a over
// UTF-16 code units). Use it after writing the theme: the output must equal the
// `hash` that tokens.js returned, or the file was not written exactly as returned.
//
//   node hash.mjs <file>
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('usage: hash.mjs <file>'); process.exit(2); }
const s = readFileSync(file, 'utf8');
let h = 2166136261;
for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
console.log((h >>> 0).toString(16));
