import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: 'class',
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        // shadcn semantic slots (HSL CSS vars — used by UI vendor components)
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
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // ── Aura Gas Management M3 tokens ─────────────────────────────────────
        // All values are CSS variables (RGB channels) so they switch between
        // dark and light themes via the `.light` class on <html>.
        // Opacity modifiers (e.g. bg-surface-container/30) work via <alpha-value>.
        surface:                    'rgb(var(--color-surface) / <alpha-value>)',
        'surface-dim':              'rgb(var(--color-surface-dim) / <alpha-value>)',
        'surface-bright':           'rgb(var(--color-surface-bright) / <alpha-value>)',
        'surface-container-lowest': 'rgb(var(--color-surface-container-lowest) / <alpha-value>)',
        'surface-container-low':    'rgb(var(--color-surface-container-low) / <alpha-value>)',
        'surface-container':        'rgb(var(--color-surface-container) / <alpha-value>)',
        'surface-container-high':   'rgb(var(--color-surface-container-high) / <alpha-value>)',
        'surface-container-highest':'rgb(var(--color-surface-container-highest) / <alpha-value>)',
        'surface-variant':          'rgb(var(--color-surface-variant) / <alpha-value>)',
        'surface-tint':             'rgb(var(--color-surface-tint) / <alpha-value>)',
        'on-surface':               'rgb(var(--color-on-surface) / <alpha-value>)',
        'on-surface-variant':       'rgb(var(--color-on-surface-variant) / <alpha-value>)',
        'inverse-surface':          'rgb(var(--color-inverse-surface) / <alpha-value>)',
        'inverse-on-surface':       'rgb(var(--color-inverse-on-surface) / <alpha-value>)',
        outline:                    'rgb(var(--color-outline) / <alpha-value>)',
        'outline-variant':          'rgb(var(--color-outline-variant) / <alpha-value>)',

        'primary-container':        'rgb(var(--color-primary-container) / <alpha-value>)',
        'on-primary-container':     'rgb(var(--color-on-primary-container) / <alpha-value>)',
        'on-primary':               'rgb(var(--color-on-primary) / <alpha-value>)',
        'primary-fixed':            'rgb(var(--color-primary-fixed) / <alpha-value>)',
        'primary-fixed-dim':        'rgb(var(--color-primary-fixed-dim) / <alpha-value>)',
        'on-primary-fixed':         'rgb(var(--color-on-primary-fixed) / <alpha-value>)',
        'on-primary-fixed-variant': 'rgb(var(--color-on-primary-fixed-variant) / <alpha-value>)',
        'inverse-primary':          'rgb(var(--color-inverse-primary) / <alpha-value>)',

        'secondary-container':          'rgb(var(--color-secondary-container) / <alpha-value>)',
        'on-secondary':                 'rgb(var(--color-on-secondary) / <alpha-value>)',
        'on-secondary-container':       'rgb(var(--color-on-secondary-container) / <alpha-value>)',
        'secondary-fixed':              'rgb(var(--color-secondary-fixed) / <alpha-value>)',
        'secondary-fixed-dim':          'rgb(var(--color-secondary-fixed-dim) / <alpha-value>)',
        'on-secondary-fixed':           'rgb(var(--color-on-secondary-fixed) / <alpha-value>)',
        'on-secondary-fixed-variant':   'rgb(var(--color-on-secondary-fixed-variant) / <alpha-value>)',

        tertiary:                       'rgb(var(--color-tertiary) / <alpha-value>)',
        'tertiary-container':           'rgb(var(--color-tertiary-container) / <alpha-value>)',
        'on-tertiary':                  'rgb(var(--color-on-tertiary) / <alpha-value>)',
        'on-tertiary-container':        'rgb(var(--color-on-tertiary-container) / <alpha-value>)',
        'tertiary-fixed':               'rgb(var(--color-tertiary-fixed) / <alpha-value>)',
        'tertiary-fixed-dim':           'rgb(var(--color-tertiary-fixed-dim) / <alpha-value>)',
        'on-tertiary-fixed':            'rgb(var(--color-on-tertiary-fixed) / <alpha-value>)',
        'on-tertiary-fixed-variant':    'rgb(var(--color-on-tertiary-fixed-variant) / <alpha-value>)',

        error:                          'rgb(var(--color-error) / <alpha-value>)',
        'error-container':              'rgb(var(--color-error-container) / <alpha-value>)',
        'on-error':                     'rgb(var(--color-on-error) / <alpha-value>)',
        'on-error-container':           'rgb(var(--color-on-error-container) / <alpha-value>)',
        success:                        'rgb(var(--color-success) / <alpha-value>)',
        warning:                        'rgb(var(--color-warning) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Hanken Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg':    ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md':   ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'data-primary':  ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'data-secondary':['12px', { lineHeight: '16px', fontWeight: '500' }],
        'data-tertiary': ['11px', { lineHeight: '14px', letterSpacing: '0.01em', fontWeight: '400' }],
        'body-base':     ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-caps':    ['10px', { lineHeight: '12px', letterSpacing: '0.05em', fontWeight: '700' }],
      },
      spacing: {
        base: '4px',
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        gutter: '16px',
        'margin-mobile': '16px',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
