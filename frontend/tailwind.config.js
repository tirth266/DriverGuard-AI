/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        'surface-hover': 'var(--surface-hover)',
        'surface-subtle': 'var(--surface-subtle)',
        'bg-secondary': 'var(--surface)',
        card: 'var(--card)',
        border: 'var(--border)',
        'border-subtle': 'var(--border-subtle)',
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-light': 'var(--accent-light)',
        brand: '#3B82F6',
        safe: '#20D98B',
        warning: '#F5B942',
        danger: '#FF4D67',
        'on-surface': 'var(--text)',
        'on-surface-variant': 'var(--muted)',
        'text-primary': 'var(--text)',
        'text-secondary': 'var(--muted)',
        'text-muted': 'var(--muted-dark)',
        foreground: 'var(--text)',
        'muted-foreground': 'var(--muted)',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        sm: '0.375rem',
        md: '0.5rem',
        button: '0.625rem', // 10px
        control: '0.625rem', // 10px
        card: '1rem', // 16px
        container: '1.25rem', // 20px
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
      fontFamily: {
        metric: ['Geist', 'Inter', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
