/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'neo-cream': '#FAFADF',
        'neo-white': '#FFFFFF',
        'neo-black': '#111111',
        'neo-yellow': '#FFE566',
        'neo-coral': '#E8635A',
        'neo-mint': '#4ECDC4',
        'neo-purple': '#7B6CF6',
        'neo-pink': '#F9A8B8',
        'neo-lavender': '#C4B5FD',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        hand: ['"Caveat"', 'cursive'],
      },
      boxShadow: {
        'neo-sm': '3px 3px 0px 0px #111111',
        'neo': '4px 4px 0px 0px #111111',
        'neo-lg': '6px 6px 0px 0px #111111',
        'neo-hover': '2px 2px 0px 0px #111111',
      },
      borderRadius: {
        'neo-sm': '6px',
        'neo': '10px',
        'neo-lg': '14px',
        'neo-pill': '999px',
      },
    },
  },
  plugins: [],
};
