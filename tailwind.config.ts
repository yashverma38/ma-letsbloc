import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        maa: { warm: '#ffb347', deep: '#c85028' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        dev: ['"Noto Sans Devanagari"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
