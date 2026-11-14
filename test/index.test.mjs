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

// ---------- Struttura specifica: Moon Landing Site Navigator ----------
import vm from 'node:vm';

const script = (html.match(/<script>([\s\S]*?)<\/script>/i) ?? [, ''])[1];

// Estrae l'oggetto I18N dallo script e lo valuta in una sandbox
function loadI18N() {
  const m = script.match(/const I18N = (\{[\s\S]*?\n\});/);
  assert.ok(m, 'oggetto I18N non trovato nello script');
  return vm.runInNewContext(`(${m[1]})`);
}

test('il titolo è "Moon Landing Site Navigator"', () => {
  assert.match(html, /<title>\s*Moon Landing Site Navigator\s*<\/title>/i);
});

test('contiene gli elementi principali della pagina', () => {
  const richiesti = [
    'stars', 'langToggle', 'langCode', 'langMenu', 'home', 'btnTutorial', 'btnWorkspace',
    'warpText', 'flash', 'skipHint', 'viewWorkspace', 'viewTutorial',
  ];
  for (const id of richiesti) {
    assert.match(html, new RegExp(String.raw`\sid=["']${id}["']`), `#${id} mancante`);
  }
  assert.match(html, /<canvas[^>]*id=["']stars["']/i, '#stars deve essere un <canvas>');
});

test('ogni getElementById dello script punta a un id esistente', () => {
  const usati = [...script.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map((m) => m[1]);
  assert.ok(usati.length > 0);
  for (const id of new Set(usati)) {
    assert.match(html, new RegExp(String.raw`\sid=["']${id}["']`), `id "${id}" usato nello script ma assente`);
  }
});

test('la home ha i pulsanti Tutorial e Workspace', () => {
  const home = html.match(/<main[^>]*id=["']home["'][\s\S]*?<\/main>/i)?.[0] ?? '';
  assert.match(home, /<button[^>]*id=["']btnTutorial["']/);
  assert.match(home, /<button[^>]*id=["']btnWorkspace["']/);
});

test('ogni vista ha un pulsante "Indietro" (data-back)', () => {
  for (const id of ['viewWorkspace', 'viewTutorial']) {
    const view = html.match(new RegExp(String.raw`<section[^>]*id=["']${id}["'][\s\S]*?</section>`, 'i'))?.[0] ?? '';
    assert.ok(view, `#${id} mancante`);
    assert.match(view, /<button[^>]*data-back/, `#${id} senza pulsante data-back`);
  }
});

test('I18N contiene le lingue it, en, es, fr, de', () => {
  const I18N = loadI18N();
  assert.deepEqual(Object.keys(I18N).sort(), ['de', 'en', 'es', 'fr', 'it']);
});

test('tutte le lingue hanno le stesse chiavi, non vuote', () => {
  const I18N = loadI18N();
  const chiaviEn = Object.keys(I18N.en).sort();
  for (const [code, testi] of Object.entries(I18N)) {
    assert.deepEqual(Object.keys(testi).sort(), chiaviEn, `chiavi diverse in "${code}"`);
    for (const [k, v] of Object.entries(testi)) {
      assert.ok(typeof v === 'string' && v.trim(), `"${code}.${k}" vuoto`);
    }
  }
});

test('ogni data-i18n nella pagina ha una traduzione', () => {
  const I18N = loadI18N();
  const chiavi = [...html.matchAll(/data-i18n=["']([^"']+)["']/g)].map((m) => m[1]);
  assert.ok(chiavi.length > 0);
  for (const k of new Set(chiavi)) {
    assert.ok(k in I18N.en, `data-i18n="${k}" senza traduzione`);
  }
});

test('il salto (warp) dura al massimo 2 secondi', () => {
  const m = script.match(/const WARP_DURATION = (\d+)/);
  assert.ok(m, 'WARP_DURATION non trovato');
  assert.ok(Number(m[1]) <= 2000, `WARP_DURATION = ${m[1]} ms`);
});

test('rispetta prefers-reduced-motion', () => {
  assert.match(html, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test('localStorage è sempre protetto da try/catch', () => {
  const usi = script.split('\n').filter((l) => l.includes('localStorage'));
  assert.ok(usi.length > 0);
  for (const riga of usi) assert.match(riga, /try\s*\{/, `localStorage senza try: ${riga.trim()}`);
});
