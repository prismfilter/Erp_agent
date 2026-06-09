import { defineConfig } from 'unocss';
import presetUno from '@unocss/preset-uno';
import presetAttributify from '@unocss/preset-attributify';

export default defineConfig({
  presets: [presetUno(), presetAttributify()],
  theme: {
    colors: {
      background: 'var(--color-background)',
      foreground: 'var(--color-foreground)',
      primary: 'var(--color-primary)',
      'primary-foreground': 'var(--color-primary-foreground)',
      sidebar: 'var(--color-sidebar)',
      'sidebar-foreground': 'var(--color-sidebar-foreground)',
      card: 'var(--color-card)',
      border: 'var(--color-border)',
      muted: 'var(--color-muted)',
      'muted-foreground': 'var(--color-muted-foreground)',
      accent: 'var(--color-accent)',
    },
  },
  safelist: [
    'bg-background',
    'text-foreground',
    'border-border',
    'bg-card',
    'text-muted-foreground',
    'bg-primary',
    'text-primary-foreground',
  ],
});
