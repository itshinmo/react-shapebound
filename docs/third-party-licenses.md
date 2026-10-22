# Third-party licenses

This project bundles open-source software and fonts. The authoritative license text ships with each
package; the list below is an index, not a replacement.

## Fonts (SIL Open Font License 1.1)

| Font           | Designer / source     | Package                      |
| -------------- | --------------------- | ---------------------------- |
| Anton          | Anton Project Authors | `@fontsource/anton`          |
| Chakra Petch   | Cadson Demak          | `@fontsource/chakra-petch`   |
| Rajdhani       | Indian Type Foundry   | `@fontsource/rajdhani`       |
| JetBrains Mono | JetBrains             | `@fontsource/jetbrains-mono` |

The fonts are bundled locally as WOFF2/WOFF assets by Fontsource. They are not fetched from a CDN at
runtime. The OFL permits embedding and redistribution; keep the license notices with distributed
builds.

## Runtime libraries

| Library      | License | Package         |
| ------------ | ------- | --------------- |
| React        | MIT     | `react`         |
| React DOM    | MIT     | `react-dom`     |
| React Router | MIT     | `react-router`  |
| Fontsource   | MIT     | `@fontsource/*` |

## Build and test tooling

Vite, TypeScript, Tailwind CSS, ESLint, Prettier, Vitest, Testing Library, and their plugins are
distributed under their respective open-source licenses (predominantly MIT). See the `LICENSE` file
inside each package in `node_modules`.

## Project license

<!-- TODO: choose a license for the game itself before distributing it. -->
