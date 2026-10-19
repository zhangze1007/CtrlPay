import type { Config } from 'tailwindcss';

/**
 * CtrlPay design system — "Holst" (7-step deep-teal ramp) + Nexora glass language.
 *
 *   950 #04222B  abyss ink      · primary dark surface, hero type, floating dock
 *   900 #0A3D4A  slate deep     · secondary dark container, folder-tab notch
 *   800 #10606F  sea-teal       · primary button, monogram badge, curve stroke
 *   600 #1D8B94  saturated jade · highlight, solid bars, glow bubble, AI orb
 *   400 #4FB8B4  foam           · gradient highlight, positive %, voice ripple
 *   200 #98D8D0  mint           · glass micro-border, folder-tab fill, segment
 *    50 #E2F4F0  arctic mint    · app ground, reverse text on dark
 *
 * Legacy aliases (700/300/100) are kept so older class names keep resolving to the
 * same hue family — the ramp is single-hue, so every step is interchangeable-ish.
 *
 * Semantic risk tones: success #10B981 · warning #F59E0B · risk #F43F5E.
 */
const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        sans: [
          'Outfit',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'Space Mono',
          'JetBrains Mono',
          'monospace',
        ],
      },
      colors: {
        holst: {
          950: '#04222B',
          900: '#0A3D4A',
          800: '#10606F',
          700: '#108B94',
          600: '#1D8B94',
          400: '#4FB8B4',
          300: '#98D8D0',
          200: '#98D8D0',
          100: '#E2F4F0',
          50: '#E2F4F0',
        },
        success: '#10B981',
        warning: '#F59E0B',
        risk: '#F43F5E',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        vault: 'hsl(var(--vault))',
        danger: 'hsl(var(--danger))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
        phone: '3.25rem',
        screen: '2.75rem',
        card: '26px',
        hero: '28px',
        tile: '16px',
      },
      boxShadow: {
        device: '0 40px 90px -20px rgba(4, 34, 43, 0.45), 0 0 0 1px rgba(4, 34, 43, 0.08)',
        soft: '0 6px 22px -10px rgba(4, 34, 43, 0.18)',
        lift: '0 10px 30px -12px rgba(4, 34, 43, 0.28)',
        glass: '0 18px 44px -26px rgba(4, 34, 43, 0.4)',
        dock: '0 16px 36px -6px rgba(4, 34, 43, 0.45)',
        orb: '0 12px 30px -8px rgba(29, 139, 148, 0.75)',
        bubble: '0 10px 24px -8px rgba(29, 139, 148, 0.6)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'sheet-up': { from: { transform: 'translateY(102%)' }, to: { transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'orb-breathe': {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 12px 30px -8px rgba(29, 139, 148, 0.75)' },
          '50%': { transform: 'scale(1.045)', boxShadow: '0 16px 40px -6px rgba(79, 184, 180, 0.85)' },
        },
        'wave-pulse': {
          '0%': { transform: 'scale(0.85)', opacity: '0.55' },
          '100%': { transform: 'scale(1.9)', opacity: '0' },
        },
        'float-glow': {
          '0%, 100%': { opacity: '0.85', transform: 'translateY(0)' },
          '50%': { opacity: '1', transform: 'translateY(-2px)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'sheet-up': 'sheet-up 0.26s cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fade-in 0.18s ease-out',
        'rise-in': 'rise-in 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
        'orb-breathe': 'orb-breathe 3.4s ease-in-out infinite',
        'wave-pulse': 'wave-pulse 1.1s ease-out infinite',
        'float-glow': 'float-glow 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
