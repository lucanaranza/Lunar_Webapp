// Structure tests for the pages (Node's built-in test runner, no dependencies).  Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'history.html', 'reasoning.html', 'mission.html', 'deep-dive.html', 'workspace.html', 'analysis.html'];

for (const page of PAGES) {
  const html = readFileSync(join(root, page), 'utf8');
  test(`${page}: doctype, lang, charset, viewport`, () => {
    assert.match(html.trimStart(), /^<!doctype html>/i);
    assert.match(html, /<html[^>]*\slang=["'][a-z-]+["']/i);
    assert.match(html, /<meta[^>]*charset=["']?utf-8["']?/i);
    assert.match(html, /<meta[^>]*name=["']viewport["'][^>]*>/i);
  });
  test(`${page}: no inline scripts, every script and stylesheet exists`, () => {
    assert.doesNotMatch(html, /<script>(?!\s*<\/script>)/i, 'scripts must be files in js/ (the CSP allows only self)');
    for (const [, src] of html.matchAll(/<script src="([^"]+)"/g)) assert.ok(existsSync(join(root, src)), src);
    for (const [, href] of html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)) assert.ok(existsSync(join(root, href)), href);
    for (const [, src] of html.matchAll(/<img[^>]*src="(images\/[^"]+)"/g)) assert.ok(existsSync(join(root, src)), src);
  });
  test(`${page}: open source – no sign-in, no privacy shield, no embedded images`, () => {
    assert.doesNotMatch(html, /type="password"|privacy-shield|loginForm|data:image\//i);
  });
}

test('every page loads the i18n texts before core.js', () => {
  for (const page of PAGES) {
    const html = readFileSync(join(root, page), 'utf8');
    assert.ok(html.indexOf('js/core/i18n-text.js') < html.indexOf('js/core/core.js'), page);
  }
});

test('the moon textures are there', () => {
  for (const f of ['images/moon-4k.jpg', 'images/moon-2k.jpg']) assert.ok(existsSync(join(root, f)), f);
});
