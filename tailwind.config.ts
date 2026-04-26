import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#132238',
        medical: '#0f8a9d',
        mint: '#d9f3ee',
        paper: '#f7f9fb'
      }
    }
  },
  plugins: []
};

export default config;
