export type ThemeMode = 'light' | 'dark' | 'system';

export function getInitialTheme(): ThemeMode {
  const saved = localStorage.getItem('medchecklist_theme') as ThemeMode;
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'system';
}

export function applyTheme(mode: ThemeMode) {
  localStorage.setItem('medchecklist_theme', mode);
  const root = document.documentElement;

  const isDark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#1a1b26');
  } else {
    root.classList.remove('dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
  }
}
