/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        merriweather: ['Merriweather', 'serif'],
      },
      colors: {
        fog: {
          dark: '#0a0a0a',
          teal: '#2dd4bf',
        }
      }
    },
  },
  plugins: [],
}
