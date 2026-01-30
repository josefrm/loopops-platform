/* eslint-disable @typescript-eslint/no-require-imports */
import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      screens: {
        '2xl': '1400px',
      },
      colors: {
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
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        // Design System Colors - Systematic numbering 0-90
        'neutral-grayscale': {
          0: 'var(--neutral-grayscale-0)', // #FFFFFF
          5: 'var(--neutral-grayscale-5)', // #FAFAFA
          10: 'var(--neutral-grayscale-10)', // #F5F5F5
          15: 'var(--neutral-grayscale-15)', // #F0F0F0
          20: 'var(--neutral-grayscale-20)', // #EEEEEE
          30: 'var(--neutral-grayscale-30)', // #DBDBDB
          40: 'var(--neutral-grayscale-40)', // #999999
          50: 'var(--neutral-grayscale-50)', // #666666
          60: 'var(--neutral-grayscale-60)', // #333333
          70: 'var(--neutral-grayscale-70)', // #262626
          80: 'var(--neutral-grayscale-80)', // #131313
          90: 'var(--neutral-grayscale-90)', // #0F0F0F
        },
        'neutral-alpha': {
          'black-05': 'var(--neutral-alpha-black-05)',
        },
        'brand-accent': {
          0: 'var(--brand-accent-0)', // #FBF4FA
          20: 'var(--brand-accent-20)', // #E4B4E0
          50: 'var(--brand-accent-50)', // #BC43B2
          60: 'var(--brand-accent-60)', // #B01CA3
          70: 'var(--brand-accent-70)', // #84157B
        },
        'brand-deliverable': {
          0: 'var(--brand-deliverable-0)', // #FBFBF4
          20: 'var(--brand-deliverable-20)', // #F2F2D9
          50: 'var(--brand-deliverable-50)', // #A6A63F
        },
        'brand-file': {
          0: 'var(--brand-file-0)', // #F4FAFB
          50: 'var(--brand-file-50)', // #3F90A6
        },
        'brand-secondary': {
          50: 'var(--brand-secondary-50)', // #D3F0F8
        },
        'system-success': {
          10: 'var(--system-success-10)', // #E8F8EA
          20: 'var(--system-success-20)', // #B2E5B9
          50: 'var(--system-success-50)', // #40BF51
        },
        'system-error': {
          10: 'var(--system-error-10)', // #FCE8ED
          20: 'var(--system-error-20)', // #EBADBF
          50: 'var(--system-error-50)', // #CC335E
        },
        'system-warning': {
          10: 'var(--system-warning-10)', // #FBF3D0
          20: 'var(--system-warning-20)', // #E6D280
          50: 'var(--system-warning-50)', // #CCAD33
        },
        'system-info': {
          10: 'var(--system-info-10)', // #E8F2FC
          20: 'var(--system-info-20)', // #A8CDF0
          50: 'var(--system-info-50)', // #2682D9
        },
        // Workspace gradient colors (used in backgrounds)
        'workspace-gradient': {
          start: '#2E9BA7',
          mid1: '#2E60A7',
          mid2: '#4A2EA7',
          end: '#9D2EA7',
        },
        // Semantic Aliases for easier usage
        'bg-neutral': {
          primary: 'var(--neutral-grayscale-0)',
          secondary: 'var(--neutral-grayscale-10)',
          tertiary: 'var(--neutral-grayscale-20)',
          ultralight: 'var(--neutral-alpha-black-05)',
        },
        'bg-neutral-inverse': {
          primary: 'var(--neutral-grayscale-90)',
          secondary: 'var(--neutral-grayscale-80)',
          tertiary: 'var(--neutral-grayscale-70)',
        },
        'bg-brand': {
          primary: 'var(--brand-accent-50)',
          secondary: 'var(--brand-accent-60)',
          tertiary: 'var(--brand-accent-70)',
        },
        'text-neutral': {
          primary: 'var(--neutral-grayscale-90)',
          secondary: 'var(--neutral-grayscale-60)',
          tertiary: 'var(--neutral-grayscale-40)',
        },
        'text-neutral-inverse': {
          primary: 'var(--neutral-grayscale-0)',
          secondary: 'var(--neutral-grayscale-20)',
          tertiary: 'var(--neutral-grayscale-30)',
        },
        'text-brand': {
          primary: 'var(--brand-accent-50)',
          secondary: 'var(--brand-accent-60)',
          tertiary: 'var(--brand-accent-70)',
        },
        'text-success': {
          primary: 'var(--system-success-50)',
          inverse: 'var(--system-success-20)',
        },
        'text-error': {
          primary: 'var(--system-error-50)',
          inverse: 'var(--system-error-20)',
        },
        'text-info': {
          primary: 'var(--system-info-50)',
          inverse: 'var(--system-info-20)',
        },
        'icon-neutral': {
          primary: 'var(--neutral-grayscale-90)',
          secondary: 'var(--neutral-grayscale-60)',
          tertiary: 'var(--neutral-grayscale-40)',
        },
        'icon-neutral-inverse': {
          primary: 'var(--neutral-grayscale-0)',
          secondary: 'var(--neutral-grayscale-20)',
          tertiary: 'var(--neutral-grayscale-30)',
        },
        agent: {
          ai: '#6B7280',
          pm: '#BF4040',
          pd: '#BF6A40',
          ba: '#BF9540',
          fed: '#BFBF40',
          ma: '#95BF40',
          ts: '#6ABF40',
          rk: '#40BF40',
          kp: '#40BF6A',
          ux: '#40BF95',
          aq: '#40BFBF',
          ui: '#4095BF',
          ag: '#406ABF',
          qa: '#4040BF',
          bed: '#BF4040',
          ds: '#9540BF',
          mk: '#BF40BF',
          ca: '#BF4095',
          ea: '#BF406A',
        },
      },
      borderRadius: {
        xs: 'var(--radius-xs)', // 8px
        sm: 'var(--radius-sm)', // 16px
        md: 'var(--radius-md)', // 24px
        lg: 'var(--radius-lg)', // 32px
        full: 'var(--radius-full)', // 999px
      },
      fontSize: {
        xs: 'var(--font-size-xs)', // (8px) - tiny labels, badges
        sm: 'var(--font-size-sm)', // (11px) - small text, captions
        md: 'var(--font-size-md)', // (12px) - body text, buttons
        base: 'var(--font-size-base)', // (14px) - default body text
        lg: 'var(--font-size-lg)', // (16px) - larger body text, inputs
        xl: 'var(--font-size-xl)', // (18px) - headings, titles
        '2xl': 'var(--font-size-2xl)', // (20px) - large headings
        '3xl': 'var(--font-size-3xl)', // (24px)
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif',
        ],
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'blink-twice': {
          '0%, 100%': { opacity: '1' },
          '25%': { opacity: '0.4' },
          '50%': { opacity: '1' },
          '75%': { opacity: '0.4' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'blink-twice': 'blink-twice 2s ease-in-out',
      },
      transitionDuration: {
        smooth: '500ms',
      },
      transitionTimingFunction: {
        smooth: 'ease-in-out',
      },
      // Custom 8-point grid system utilities
      height: {
        'loop-1': '4px', // h-loop-1
        'loop-2': '8px', // h-loop-2
        'loop-3': '12px', // h-loop-3
        'loop-4': '16px', // h-loop-4
        'loop-5': '20px', // h-loop-5
        'loop-6': '24px', // h-loop-6
        'loop-7': '28px', // h-loop-7
        'loop-8': '32px', // h-loop-8 (buttons default)
        'loop-9': '36px', // h-loop-9
        'loop-10': '40px', // h-loop-10
        'loop-11': '44px', // h-loop-11
        'loop-12': '48px', // h-loop-12
        'loop-14': '56px', // h-loop-14
        'loop-16': '64px', // h-loop-16
        'loop-20': '80px', // h-loop-20
        'loop-24': '96px', // h-loop-24
        'loop-32': '128px', // h-loop-32
      },
      width: {
        'loop-1': '4px', // w-loop-1
        'loop-2': '8px', // w-loop-2
        'loop-3': '12px', // w-loop-3
        'loop-4': '16px', // w-loop-4
        'loop-5': '20px', // w-loop-5
        'loop-6': '24px', // w-loop-6
        'loop-7': '28px', // w-loop-7
        'loop-8': '32px', // w-loop-8
        'loop-9': '36px', // w-loop-9
        'loop-10': '40px', // w-loop-10
        'loop-11': '44px', // w-loop-11
        'loop-12': '48px', // w-loop-12
        'loop-14': '56px', // w-loop-14
        'loop-16': '64px', // w-loop-16
        'loop-20': '80px', // w-loop-20
        'loop-24': '96px', // w-loop-24
        'loop-32': '128px', // w-loop-32
      },
      spacing: {
        'loop-1': '4px', // p-loop-1, m-loop-1, gap-loop-1, etc.
        'loop-2': '8px', // p-loop-2, m-loop-2, gap-loop-2, etc.
        'loop-3': '12px', // p-loop-3, m-loop-3, gap-loop-3, etc.
        'loop-4': '16px', // p-loop-4, m-loop-4, gap-loop-4, etc.
        'loop-5': '20px', // p-loop-5, m-loop-5, gap-loop-5, etc.
        'loop-6': '24px', // p-loop-6, m-loop-6, gap-loop-6, etc.
        'loop-7': '28px', // p-loop-7, m-loop-7, gap-loop-7, etc.
        'loop-8': '32px', // p-loop-8, m-loop-8, gap-loop-8, etc.
        'loop-9': '36px', // p-loop-9, m-loop-9, gap-loop-9, etc.
        'loop-10': '40px', // p-loop-10, m-loop-10, gap-loop-10, etc.
        'loop-11': '44px', // p-loop-11, m-loop-11, gap-loop-11, etc.
        'loop-12': '48px', // p-loop-12, m-loop-12, gap-loop-12, etc.
        'loop-14': '56px', // p-loop-14, m-loop-14, gap-loop-14, etc.
        'loop-16': '64px', // p-loop-16, m-loop-16, gap-loop-16, etc.
        'loop-20': '80px', // p-loop-20, m-loop-20, gap-loop-20, etc.
        'loop-24': '96px', // p-loop-24, m-loop-24, gap-loop-24, etc.
        'loop-32': '128px', // p-loop-32, m-loop-32, gap-loop-32, etc.
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/container-queries'),
    function ({ addUtilities }: any) {
      const newUtilities = {
        '.scrollbar-hide': {
          /* Hide scrollbar for Chrome, Safari and Opera */
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          /* Hide scrollbar for IE, Edge and Firefox */
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
        },
        '.bg-workspace-gradient': {
          background: 'var(--gradient-workspace)',
        },
      };
      addUtilities(newUtilities);
    },
  ],
} satisfies Config;
