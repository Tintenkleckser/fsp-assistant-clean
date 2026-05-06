import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#132238',
        medical: '#4A90E2',
        mint: '#EAF3FD',
        paper: '#f7f9fb'
      }
    }
  },
  plugins: []
};

export default config;
