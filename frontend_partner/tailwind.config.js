/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-nunito)', 'Nunito', 'system-ui', 'sans-serif'],
        display: ['var(--font-plus-jakarta)', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Partner purple palette — derived from the design reference
        partner: {
          50:  '#FAF5FF',
          100: '#F5F0FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7C3AED',
          800: '#6D28D9',
          900: '#4C1D95',
          950: '#3B0764',
        },
        // Semantic aliases
        primary: {
          DEFAULT: '#9333EA',
          foreground: '#FFFFFF',
          light: '#C084FC',
          lighter: '#E9D5FF',
          subtle: '#F5F0FF',
          page: '#FAF5FF',
        },
        text: {
          dark: '#3B0764',
          mid: '#7E5BA6',
          soft: '#B39DCA',
        },
        surface: {
          DEFAULT: '#FAF5FF',
          card: '#FFFFFF',
          border: '#E9D5FF',
          'border-focus': '#A855F7',
        },
        sidebar: {
          bg: '#1e0a3c',
          hover: '#2d1260',
          border: '#3d1f72',
          active: '#3d1f72',
          text: 'rgba(255,255,255,0.85)',
          'text-muted': 'rgba(255,255,255,0.45)',
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
          'success-bg': '#ECFDF5',
          'warning-bg': '#FFFBEB',
          'error-bg': '#FEF2F2',
          'info-bg': '#EFF6FF',
        },
      },
      backgroundImage: {
        'gradient-partner': 'linear-gradient(135deg, #C084FC 0%, #9333EA 55%, #7C3AED 100%)',
        'gradient-partner-soft': 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
        'gradient-partner-page': 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 50%, #FAF5FF 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(245,240,255,0.95) 100%)',
        'gradient-progress': 'linear-gradient(90deg, #C084FC, #9333EA)',
        'gradient-pink-purple': 'linear-gradient(135deg, #D946A8, #9333EA)',
      },
      boxShadow: {
        partner: '0 4px 16px rgba(147,51,234,0.25)',
        'partner-lg': '0 8px 32px rgba(147,51,234,0.30)',
        'partner-xl': '0 16px 48px rgba(147,51,234,0.20)',
        glass: '0 4px 24px rgba(147,51,234,0.08)',
        'glass-lg': '0 8px 40px rgba(147,51,234,0.12)',
        card: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(147,51,234,0.06)',
        'card-hover': '0 4px 20px rgba(147,51,234,0.12)',
        focus: '0 0 0 3px rgba(168,85,247,0.14)',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        card: '0.75rem',
        hero: '1.25rem',
        pill: '9999px',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.4s ease-out forwards',
        shimmer: 'shimmer 2s infinite linear',
        float: 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'progress-fill': 'progressFill 0.5s cubic-bezier(.4,0,.2,1) forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        },
        progressFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width)' },
        },
      },
      spacing: {
        sidebar: '288px',
        'sidebar-collapsed': '72px',
      },
    },
  },
  plugins: [],
};
