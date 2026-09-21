import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pastel: {
          mint: '#C7F0DB',
          'mint-dark': '#9FE0C2',
          sky: '#BFE3FF',
          'sky-dark': '#8FCBF5',
          lilac: '#E0D7FF',
          'lilac-dark': '#C4B5FD',
          coral: '#FFB3A0',
          'coral-dark': '#FF9377',
          lemon: '#FFF1B8',
          'lemon-dark': '#FFE380',
          rose: '#FFC2D4',
          'rose-dark': '#FF9BB8',
        },
      },
      fontFamily: {
        display: ['"Baloo 2"', 'Nunito', 'system-ui', 'sans-serif'],
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 6px 20px -8px rgba(80, 80, 140, 0.35)',
        lifted: '0 16px 36px -12px rgba(80, 80, 140, 0.45)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-24px) scale(1.05)' },
        },
        bouncein: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '60%': { transform: 'scale(1.03)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        float: 'float 9s ease-in-out infinite',
        bouncein: 'bouncein 400ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
