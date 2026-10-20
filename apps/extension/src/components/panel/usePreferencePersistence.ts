import { useCallback, useEffect, useRef, useState } from 'react';
import type { PanelPreferences } from '../../services/progressStore';

export function usePreferencePersistence(
  preferences: PanelPreferences,
  onSave?: (preferences: PanelPreferences) => void | Promise<void>,
) {
  const latest = useRef({ preferences, onSave });
  latest.current = { preferences, onSave };
  const lastSubmitted = useRef<PanelPreferences | null>(null);
  const generation = useRef(0);
  const mounted = useRef(false);
  const [failed, setFailed] = useState(false);
  const save = useCallback(() => {
    const { preferences: snapshot, onSave: write } = latest.current;
    if (!write) return;
    const current = ++generation.current;
    lastSubmitted.current = snapshot;
    const rejected = () => {
      if (current === generation.current) {
        lastSubmitted.current = null;
        if (mounted.current) setFailed(true);
      }
    };
    try {
      void Promise.resolve(write(snapshot)).then(() => {
        if (mounted.current && current === generation.current) setFailed(false);
      }, rejected);
    } catch {
      rejected();
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const flush = () => {
      if (lastSubmitted.current !== latest.current.preferences) save();
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      mounted.current = false;
      if (lastSubmitted.current !== latest.current.preferences) save();
    };
  }, [save]);
  useEffect(() => {
    const timeout = window.setTimeout(save, 250);
    return () => window.clearTimeout(timeout);
  }, [preferences, save]);
  return { failed, retry: save };
}
