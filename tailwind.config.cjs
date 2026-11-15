/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: ['class', "[data-theme='dark']"],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        paper: '#FAF9F6',
        'paper-alt': '#F5F4F0',
        ink: '#0D0D0D',
        hairline: '#E5E5E2',
        muted: '#706F6C',
        signal: '#E5383B',
        // Kept from the supplied Stitch Tailwind block where those names are used.
        surface: '#FAF9F6',
        'surface-container-low': '#F4F3F1',
        'surface-container-high': '#E9E8E5',
        'on-surface': '#1A1C1A',
        'on-surface-variant': '#444748',
        secondary: '#B81120',
        error: '#BA1A1A',
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
        full: '9999px',
      },
      spacing: {
        gutter: '1rem',
        'gutter-sm': '0.75rem',
        margin: '1.25rem',
        'margin-mobile': '1rem',
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2.5rem',
        'space-2xl': '4rem',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        'display-hero': ['Space Grotesk', 'sans-serif'],
        'display-hero-mobile': ['Space Grotesk', 'sans-serif'],
        'label-mono-sm': ['JetBrains Mono', 'monospace'],
        'label-mono-lg': ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-hero': [
          '64px',
          { lineHeight: '60px', letterSpacing: '-0.05em', fontWeight: '700' },
        ],
        'display-hero-mobile': [
          '48px',
          { lineHeight: '46px', letterSpacing: '-0.04em', fontWeight: '700' },
        ],
        'headline-lg': [
          '36px',
          { lineHeight: '38px', letterSpacing: '-0.04em', fontWeight: '700' },
        ],
        'headline-lg-mobile': [
          '28px',
          { lineHeight: '30px', letterSpacing: '-0.03em', fontWeight: '700' },
        ],
        'headline-md': [
          '20px',
          { lineHeight: '24px', letterSpacing: '-0.02em', fontWeight: '600' },
        ],
        'body-lg': ['16px', { lineHeight: '22px', letterSpacing: '-0.01em', fontWeight: '500' }],
        'body-sm': ['14px', { lineHeight: '18px', fontWeight: '400' }],
        'label-mono-lg': [
          '13px',
          { lineHeight: '16px', letterSpacing: '0.04em', fontWeight: '500' },
        ],
        'label-mono-sm': [
          '11px',
          { lineHeight: '14px', letterSpacing: '0.06em', fontWeight: '500' },
        ],
      },
    },
  },
  plugins: [],
};
