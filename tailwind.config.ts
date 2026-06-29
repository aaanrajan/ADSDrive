/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts}',
    './node_modules/@ionic/angular/**/*.js'
  ],
  safelist: [
    // span/grid utilities
    {
      pattern: /^col-span-(1|2|3|4|6|12)$/,
      variants: ['sm', 'md']
    },
    // spacing / gaps
    {
      pattern: /^gap-\d+$/,
    },
    {
      pattern: /^space-y-(2|4|6|8|10)$/,
    },
    // borders / rings / cursor
    'cursor-grab',
    { pattern: /^ring-(\d|2|4)$/ }, // e.g., ring-2
    { pattern: /^ring-[\w-]+$/ }, // ring-orange-300 etc.
    { pattern: /^border(-\d)?$/ }, // border, border-2
    { pattern: /^border-(dashed|solid)$/ },
    { pattern: /^border-[\w-]+$/ }, // border-orange-300 etc.
    'w-full',
    'h-full',
    'text-center',
    'max-w-md',
    'grid-cols-1',
    'flex',
    'grid',
    'grid-cols-2',
    'flex-col'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [
    // @ts-ignore
    function ({ addVariant }) {
      addVariant('platform-native', '.platform-native &');
    },
  ],
};
