import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
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
    extend: {
      colors: {
        transparent: 'transparent',
        white: '#ffffff',
        black: '#000000',
        blue: {
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        red: {
          400: '#f87171',
          500: '#ef4444',
        },
        green: {
          500: '#22c55e',
        },
        gray: {
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        slate: {
          950: '#020617',
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};

export default config;
