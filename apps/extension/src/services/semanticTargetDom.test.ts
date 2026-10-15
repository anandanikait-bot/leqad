import { afterEach, expect, it } from 'vitest';
import { semanticName } from './semanticTargetDom';

afterEach(() => document.body.replaceChildren());

it('does not accept a truncated name when unread disqualifying text remains', () => {
  const row = document.createElement('div');
  row.append(document.createTextNode('Top'));
  for (let i = 0; i < 63; i++) row.append(document.createTextNode(''));
  row.append(document.createTextNode('custom feature'));
  expect(semanticName(row)).toBe('');
});

it('bounds referenced-label traversal without reading the entire subtree', () => {
  const label = document.createElement('div');
  label.id = 'reference';
  label.append(document.createTextNode('Top'));
  for (let i = 0; i < 5500; i++) label.append(document.createElement('span'));
  Object.defineProperty(label, 'textContent', {
    get: () => {
      throw new Error('Unbounded subtree read');
    },
  });
  const row = document.createElement('div');
  row.setAttribute('aria-labelledby', 'reference');
  document.body.append(label, row);
  expect(semanticName(row)).toBe('');
});
