/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAF8F5', // Warm off-white
        surface: '#FFFFFF',
        canvasWarm: '#FAF8F5',
        cardWarm: '#FDFBF7',
        ink: {
          900: '#111827', // Deep ink
          700: '#374151',
          500: '#6B7280',
          400: '#9CA3AF',
          300: '#D1D5DB',
          200: '#E5E7EB',
          100: '#F3F4F6',
          50: '#F9FAFB',
        },
        accent: {
          DEFAULT: '#0F766E', // Refined Deep Teal default
          hover: '#115E59',
          blue: '#2563EB',
        },
        label: {
          client: '#C25E38',      // Terracotta / amber
          clientBg: '#FDF2E9',
          assistant: '#0F766E',   // Deep teal
          assistantBg: '#F0FDFA',
          noReply: '#64748B',     // Neutral slate gray
          noReplyBg: '#F1F5F9',
          review: '#7C3AED',      // Violet
          reviewBg: '#F5F3FF',
        },
        borderMuted: '#E5E7EB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.02)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        'float': '0 16px 40px -8px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.04)',
        'soft': '0 2px 10px rgba(0, 0, 0, 0.03)',
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
    },
  },
  plugins: [],
};
