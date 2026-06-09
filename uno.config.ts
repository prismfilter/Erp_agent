import { defineConfig } from 'unocss';
import presetUno from '@unocss/preset-uno';

export default defineConfig({
  presets: [presetUno()],
  theme: {
    colors: {
      background: 'var(--app-bg)',
      foreground: 'var(--app-fg)',
      primary: 'var(--app-primary)',
      'primary-foreground': 'var(--app-primary-fg)',
      sidebar: 'var(--app-sidebar)',
      'sidebar-foreground': 'var(--app-sidebar-fg)',
      card: 'var(--app-card)',
      border: 'var(--app-border)',
      muted: 'var(--app-muted)',
      'muted-foreground': 'var(--app-muted-fg)',
      accent: 'var(--app-accent)',
    },
  },
});
