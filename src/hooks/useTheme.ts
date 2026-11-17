import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'msp_theme';

const DEFAULT_THEME: Theme = 'dark';

export function getStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // localStorage can be unavailable in private browsing / strict modes
  }
  return DEFAULT_THEME;
}

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return systemPrefersDark() ? 'dark' : 'light';
  }
  return theme;
}

/** Apply a theme to the document. Safe to call outside React. */
export function applyTheme(theme: Theme): ResolvedTheme {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;

  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures — the class change still applies for this session.
  }

  return resolved;
}

/**
 * Shared light/dark/system theme controller.
 * The header and app read the same `msp_theme` key so every user can change
 * the theme without admin access.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(getStoredTheme()));

  // Apply on mount and whenever the selected theme changes.
  useEffect(() => {
    setResolved(applyTheme(theme));
  }, [theme]);

  // Follow the OS preference while "system" is selected.
  useEffect(() => {
    if (theme !== 'system' || typeof window.matchMedia !== 'function') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(applyTheme('system'));

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        const next = getStoredTheme();
        setThemeState(next);
        setResolved(applyTheme(next));
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    setResolved(applyTheme(next));
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolveTheme(theme) === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  return { theme, resolved, setTheme, toggle };
}
