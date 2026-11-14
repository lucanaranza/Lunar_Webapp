// Test di struttura per index.html (test runner integrato di Node, nessuna dipendenza).
// Esecuzione: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const htmlPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
const html = existsSync(htmlPath) ? readFileSync(htmlPath, 'utf8') : '';

test('index.html esiste e non è vuoto', () => {
  assert.ok(existsSync(htmlPath), 'index.html non trovato');
  assert.ok(html.trim().length > 0, 'index.html è vuoto');
});

test('inizia con il doctype HTML5', () => {
  assert.match(html.trimStart(), /^<!doctype html>/i);
});

test('ha <html> con attributo lang', () => {
  assert.match(html, /<html[^>]*\slang=["'][a-z-]+["']/i);
});

test('dichiara la codifica UTF-8', () => {
  assert.match(html, /<meta[^>]*charset=["']?utf-8["']?/i);
});

test('ha il meta viewport per il mobile', () => {
  assert.match(html, /<meta[^>]*name=["']viewport["'][^>]*>/i);
});

test('ha un <title> non vuoto', () => {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  assert.ok(m, '<title> mancante');
  assert.ok(m[1].trim().length > 0, '<title> vuoto');
});

test('ha <head> e <body> ben chiusi', () => {
  for (const tag of ['html', 'head', 'body']) {
    assert.match(html, new RegExp(`<${tag}[\\s>]`, 'i'), `<${tag}> mancante`);
    assert.match(html, new RegExp(`</${tag}>`, 'i'), `</${tag}> mancante`);
  }
});

test('ogni <img> ha un attributo alt', () => {
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  const senzaAlt = imgs.filter((tag) => !/\salt=/i.test(tag));
  assert.deepEqual(senzaAlt, [], `immagini senza alt: ${senzaAlt.join(', ')}`);
});

test('nessun id duplicato', () => {
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((m) => m[1]);
  const duplicati = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(duplicati, [], `id duplicati: ${duplicati.join(', ')}`);
});
