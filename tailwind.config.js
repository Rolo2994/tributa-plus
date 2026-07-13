/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta institucional SUNAT + lavado de cara premium.
        // Reutiliza exactamente los mismos valores del prototipo HTML
        // aprobado, para que la migración a React no cambie el look.
        azul: {
          inst: '#0B3A60',
          dark: '#072844',
        },
        rojo: {
          sunat: '#C8102E',
        },
        ambar: '#D9A404',
        verde: {
          DEFAULT: '#1E8F5F',
          console: '#3BEB8A',
        },
        bgapp: '#EEF2F7',
        ink: '#152233',
        muted: '#68788A',
        bordersoft: '#DDE4EC',
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      keyframes: {
        radar: {
          '0%': { transform: 'scale(1)', opacity: '0.55' },
          '75%, 100%': { transform: 'scale(2.6)', opacity: '0' },
        },
        fadein: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        radar: 'radar 1.6s cubic-bezier(0,0,0.2,1) infinite',
        fadein: 'fadein .35s ease forwards',
      },
      boxShadow: {
        card: '0 2px 10px -4px rgba(11,58,96,0.12)',
        float: '0 12px 30px -10px rgba(0,0,0,0.55)',
        phone: '0 30px 60px -20px rgba(7,40,68,0.45)',
      },
    },
  },
  plugins: [],
}
