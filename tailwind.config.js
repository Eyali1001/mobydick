/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/client/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        beige: {
          DEFAULT: '#F5F0E6',
          light: '#FAF7F2',
          dark: '#EBE6DC',
          border: '#D4CFC4',
        },
        ink: {
          DEFAULT: '#1A1A1A',
          light: '#2C2C2C',
          muted: '#666666',
        }
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
      }
    },
  },
  plugins: [],
}
