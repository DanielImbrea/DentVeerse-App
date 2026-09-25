/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@dental/config/tailwind-preset')],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Fraunces', 'serif'],
        body: ['var(--font-body)', 'Inter', 'sans-serif'],
      },
    },
  },
};
