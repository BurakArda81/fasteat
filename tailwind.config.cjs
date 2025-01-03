/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./public/**/*.{html,js}",
      "./public/src/**/*.css"
    ],
    theme: {
      extend: {
        colors: {
          'primary': 'var(--primary)',
          'primary-light': 'var(--primary-light)',
          'primary-dark': 'var(--primary-dark)',
          'secondary': 'var(--secondary)',
          'text-primary': 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'bg-main': 'var(--bg-main)',
          'bg-card': 'var(--bg-card)',
          'bg-hover': 'var(--bg-hover)',
        },
        spacing: {
          'xs': 'var(--spacing-xs)',
          'sm': 'var(--spacing-sm)',
          'md': 'var(--spacing-md)',
          'lg': 'var(--spacing-lg)',
          'xl': 'var(--spacing-xl)',
        },
        borderRadius: {
          'sm': 'var(--radius-sm)',
          'md': 'var(--radius-md)',
          'lg': 'var(--radius-lg)',
        },
        boxShadow: {
          'sm': 'var(--shadow-sm)',
          'md': 'var(--shadow-md)',
          'lg': 'var(--shadow-lg)',
        }
      }
    },
    plugins: [
      require('@tailwindcss/forms')
    ]
  }