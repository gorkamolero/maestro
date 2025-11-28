/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './src/mobile/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm dark backgrounds
        surface: {
          primary: '#12110f',
          card: '#1a1816',
          elevated: '#221f1c',
          hover: '#2a2622',
        },
        // Warm text colors
        content: {
          primary: '#e8e4df',
          secondary: '#8a8680',
          tertiary: '#5c5955',
        },
        // Status colors - muted
        status: {
          success: '#4ade80',
          warning: '#fbbf24',
          error: '#f87171',
          info: '#60a5fa',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'body': ['15px', '1.5'],
        'small': ['13px', '1.5'],
        'label': ['13px', '1.5'],
        'card-title': ['15px', '1.4'],
        'section-header': ['13px', '1.4'],
        'page-title': ['18px', '1.3'],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'input': '8px',
        'sheet': '16px',
      },
      animation: {
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 currentColor' },
          '50%': { opacity: '0.8', boxShadow: '0 0 8px 2px currentColor' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'elevated': '0 4px 16px rgba(0, 0, 0, 0.4)',
        'sheet': '0 -4px 20px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
