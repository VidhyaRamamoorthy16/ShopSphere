/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2874F0',
          dark: '#1c5fd1',
          light: '#4a8cf5',
        },
        accent: {
          DEFAULT: '#FF9F00',
          dark: '#e68a00',
        },
        'flip-blue': '#2874F0',
        'flip-yellow': '#FFE500',
        'flip-dark': '#172337',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
