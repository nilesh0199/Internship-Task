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
        ink: {
          900: '#111827', // Deep ink
          700: '#374151',
          500: '#6B7280',
          300: '#D1D5DB',
          100: '#F3F4F6',
        },
        accent: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
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
    },
  },
  plugins: [],
};
