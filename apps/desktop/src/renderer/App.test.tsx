import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { App } from './App';
afterEach(cleanup);
it('starts as an honest written-only desktop bootstrap', () => {
  render(<App />);
  expect(screen.getByText('Written lessons only')).toBeTruthy();
});
