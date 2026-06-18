/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        foreground: '#f9fafb',
        background: '#0a0e1a',
        muted: {
          DEFAULT: '#111827',
          foreground: '#4b5563',
        },
        card: { DEFAULT: '#111827', foreground: '#f9fafb' },
        secondary: { DEFAULT: '#1f2937', foreground: '#f9fafb' },
        border: 'rgba(255,255,255,0.06)',
        ring: '#3b82f6',
      },
    },
  },
  plugins: [],
}

