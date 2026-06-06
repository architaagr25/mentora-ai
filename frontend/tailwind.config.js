/** @type {import('tailwindcss').Config} */
export default {
  // Tell Tailwind which files to scan for class names
  // It only includes CSS for classes you actually use - keeping bundle size small
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom colours for Mentora AI brand
      colors: {
        navy: {
          900: '#0A0F1E',   // darkest background
          800: '#0D1426',   // card backgrounds
          700: '#111827',   // slightly lighter cards
          600: '#1E293B',   // borders
        },
        purple: {
          600: '#7C3AED',   // primary accent
          500: '#8B5CF6',   // hover state
          400: '#A78BFA',   // lighter purple
        },
        cyan: {
          500: '#06B6D4',   // secondary accent
          400: '#22D3EE',   // hover state
        }
      },
      // Custom fonts
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Custom animations
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}