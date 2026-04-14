import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}", 
    "./components/**/*.{js,ts,jsx,tsx,mdx}", 
    "./lib/**/*.{js,ts,jsx,tsx,mdx}", 
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
      },
      colors: {

        status: {
          success: '#16a34a', // Plaćeno (zelena)
          pending: '#f59e0b', // U obradi (amber/narančasta)
          failed: '#dc2626',  // Neuspjelo (crvena)
          info: '#2563eb',    // Info/Pretplata (plava)
        },

        surface: {
          light: '#f9fafb',   // gray-50 za pozadine tablica
          border: '#e5e7eb',  // gray-200 za obrube
        },

        blue: {
          400: '#2589FE',
          500: '#0070F3',
          600: '#2F6FEB',
        },
        borderRadius: {
        'card': '1rem', // tvoj rounded-xl koji svuda koristimo
      },
      },
    },
    keyframes: {
      shimmer: {
        '100%': {
          transform: 'translateX(100%)',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
export default config;
