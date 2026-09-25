/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@dental/config/tailwind-preset')],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
};
