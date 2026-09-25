/** @type {import('tailwindcss').Config} */
module.exports = {
  // Required on Expo web: NativeWind/css-interop must not use `media` when toggling scheme.
  darkMode: 'class',
  presets: [require('nativewind/preset'), require('@dental/config/tailwind-preset')],
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
};
