export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  proseWrap: 'preserve',
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/styles/global.css',
  overrides: [
    {
      files: ['*.jsonc'],
      options: { parser: 'jsonc' },
    },
  ],
};
