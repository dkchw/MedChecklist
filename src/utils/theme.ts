export type ThemeMode = 'light' | 'dark' | 'system';

let systemThemeCleanup: (() => void) | null = null;

export function getInitialTheme(): ThemeMode {
  const saved = localStorage.getItem('medchecklist_theme') as ThemeMode;
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'system';
}

export function applyTheme(mode: ThemeMode) {
  localStorage.setItem('medchecklist_theme', mode);

  // Clean up any previous system theme listener
  if (systemThemeCleanup) {
    systemThemeCleanup();
    systemThemeCleanup = null;
  }

  const root = document.documentElement;
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const setDarkClass = (isDark: boolean) => {
    if (isDark) {
      root.classList.add('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#1a1b26');
    } else {
      root.classList.remove('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
    }
  };

  if (mode === 'system') {
    // Apply current system preference
    setDarkClass(mediaQuery.matches);

    // Listen for OS theme changes
    const handler = (e: MediaQueryListEvent) => setDarkClass(e.matches);
    mediaQuery.addEventListener('change', handler);
    systemThemeCleanup = () => mediaQuery.removeEventListener('change', handler);
  } else {
    setDarkClass(mode === 'dark');
  }
}

/** Check if dark mode is currently active (regardless of source) */
export function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}
