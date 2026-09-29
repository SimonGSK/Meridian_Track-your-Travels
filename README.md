# Countries of the World

An interactive 3D globe: spin it, hover a country to see its name, click it to fly there and open its info panel.

Built with React, TypeScript and Vite, using [react-globe.gl](https://github.com/vasturiano/react-globe.gl) (three.js) for the globe and [world-atlas](https://github.com/topojson/world-atlas) (Natural Earth 1:50m) for country shapes.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | Lint with Oxlint |
| `npm test` | Unit and component tests (Vitest) |
| `npm run test:watch` | Same, re-running on changes |
| `npm run test:e2e` | End-to-end tests against the real WebGL globe (Playwright) |

The first time you run the end-to-end tests, install the browser:

```bash
npx playwright install chromium
```

## How it works

```
src/
  App.tsx              globe, hover/selection state, camera flights
  CountryPanel.tsx     panel shown for the selected country
  Tooltip.tsx          country name that follows the mouse
  countries.ts         country shapes, borders, and point → country lookup
  globe/
    countryLayer.ts    all countries merged into one mesh + one border line set
    hooks.ts           adding the layer, pointer picking, smooth auto-rotate
    interaction.ts     click-vs-drag, flight duration/altitude, easing
    picking.ts         screen position → lat/lng on the globe
    style.ts           colors and heights
e2e/                   Playwright tests
```

A few choices keep the globe smooth:

- **One mesh for all countries.** The globe library's polygon layer draws each country piece separately (~1,500 meshes, 7,500+ draw calls per frame). Instead, every country is merged into a single mesh. Only the hovered and selected countries go through the polygon layer, raised on top.
- **No mesh raycasting.** Hover and click intersect a ray with the globe's sphere, then look up which country contains that lat/lng, which takes about 0.1 ms.
- **Antimeridian workaround.** Russia's mainland crosses 180°, which sends the triangulation down a path that takes seconds. It's built rotated away from 180° and rotated back.
- **Eased auto-rotate.** The idle spin eases in and out, pauses while hovering a country, stops when you grab the globe, and resumes shortly after you let go.

## Country data

Each country has a `name`, an `isoCode` (ISO 3166-1 numeric, e.g. `"208"` for Denmark) and a `centroid` (center of its largest landmass). A few disputed areas such as Kosovo and Somaliland have no ISO code (`null`). Antarctica is left out.

## Commit messages

This repo uses [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
