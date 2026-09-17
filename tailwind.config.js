/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tenno: {
          dark: '#0a0d14',
          card: '#121824',
          border: '#1e293b',
          accent: '#10b981', // Neon emerald
          warning: '#f59e0b',
          danger: '#ef4444',
          guilherme: '#3b82f6',
          caio: '#8b5cf6'
        }
      }
    },
  },
  plugins: [],
};
