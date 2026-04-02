import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Syne', 'sans-serif'],
        body:    ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        /* Couleurs primaires */
        'nyme-primary':      '#1A4FBF',
        'nyme-primary-dark': '#0A2E8A',
        /* Aliases compatibilité */
        'nyme-blue':         '#1A4FBF',
        'nyme-blue-mid':     '#0A2E8A',
        'nyme-blue-light':   '#3B7DDD',
        'nyme-dark':         '#071e6b',
        /* Accents */
        'nyme-orange':       '#E87722',
        'nyme-red':          '#EF4444',
        'nyme-green':        '#22C55E',
        'nyme-amber':        '#F59E0B',
        'nyme-violet':       '#8B5CF6',
        /* Surfaces claires */
        'nyme-bg':           '#F8FAFF',
        'nyme-bg-input':     '#F0F4FF',
        'nyme-card':         '#FFFFFF',
        'nyme-border':       '#D6E0F5',
        /* Texte */
        'nyme-text':         '#0A2E8A',
        'nyme-text-muted':   '#5B7BB5',
      },
      boxShadow: {
        'card':       '0 4px 20px rgba(26,79,191,0.08)',
        'card-hover': '0 12px 40px rgba(26,79,191,0.18)',
        'nyme-lg':    '0 8px 32px rgba(232,119,34,0.18)',
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [],
}

export default config
