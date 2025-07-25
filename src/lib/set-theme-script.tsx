export function ThemeScript({ storageKey = "vite-ui-theme" }: { storageKey?: string }) {
  const script = `
    ;(function() {
      try {
        const theme = localStorage.getItem('${storageKey}');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const effectiveTheme = theme === 'dark' || (!theme && systemDark) ? 'dark' : 'light';
        document.documentElement.classList.add(effectiveTheme);
      } catch(e) {}
    })()
  `
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}