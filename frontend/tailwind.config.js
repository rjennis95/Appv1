/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'terminal-bg': '#0d1117',
        'terminal-text': '#c9d1d9',
        'terminal-green': '#00ff41',
        'terminal-orange': '#ffb000',
        'terminal-blue': '#00a8ff',
      },
    },
  },
  plugins: [],
}
