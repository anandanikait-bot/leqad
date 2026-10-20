import { useEffect, useState } from 'react';
import type { Appearance } from '../../services/progressStore';

export function useAppearance(appearance: Appearance): 'light' | 'dark' {
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  );
  useEffect(() => {
    if (appearance !== 'system' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [appearance]);
  return appearance === 'system' ? (systemDark ? 'dark' : 'light') : appearance;
}
