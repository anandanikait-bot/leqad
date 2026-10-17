import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const read = () =>
  readFileSync(new URL('./index.html', import.meta.url), 'utf8');
test('manual exact-variant instructions and honest outcome', () => {
  const html = read();
  for (const text of [
    'Corner rectangle',
    'Alt',
    'Option',
    'Highlight tool in toolbar',
    'not available',
    'not verified',
    'does not satisfy automatic SHOW acceptance',
  ])
    assert.ok(html.includes(text), text);
});
test('passive standalone card has no executable code, data collection or CAD actions', () => {
  const html = read();
  assert.doesNotMatch(
    html,
    /<script|<iframe|<form|<input|<button|\bon\w+\s*=|javascript:|url\(/i,
  );
  const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(links, [
    'https://cad.onshape.com/help/Content/Home/search_tools.htm',
  ]);
  assert.match(html, /name="viewport"/);
  assert.match(html, /<html lang="en">/);
});
