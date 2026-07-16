import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#9A1B1F',
          redDark: '#731417',
          redDarker: '#4D0E10',
          redLight: '#AE494C',
          ink: '#0D1217',
          cream: '#ECE8DF',
          sand: '#E1D5C9',
          gold: '#C69A5D',
          taupe: '#AB958B',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-serif-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(13,18,23,0.08), 0 1px 2px rgba(13,18,23,0.04)',
      },
    },
  },
  plugins: [],
};
export default config;
