# Countries of the World

An interactive 3D globe: spin it, hover a country to see its name and flag, click it to fly there and see its capital, population and area.

The menu on the left (a tab bar on phones) has:

- **Explore**: tips on using the globe, and settings to show or hide visited countries, visited states, city pins and the markers around small islands.
- **Visited**: keep track of where you've been, out of the world's 197 countries, with the count and percentage for each continent (territories are counted separately). Your places are listed by continent. Search to add places (old names like "Swaziland" work too), or click a country and press "Mark as visited". They're colored on the globe.

  For the USA, Canada, Australia and Brazil you can also mark the states, provinces and territories you've visited: click the country (on the globe or in the list) and tick them in its panel, or click them on the globe. They're drawn over the country in a darker shade.

  Every country's panel also lists its big and well-known cities (the capital first) to tick off. Each city you've visited gets a pin on the globe; point at a pin to see the city's name, or click it to open its country. Ticking a city also marks its country, and its state, as visited.
- **Games**:
  - *Find the country*: click the named country on the globe, with three tries (3, 2 or 1 points). Hard leaves out the 49 biggest countries.
  - *Letter hunt*: click every country starting with a letter. Each letter belongs to one difficulty (easy D F H J K R U V Z, medium A E G I L N P T, hard B C M S); pick any letter, or a random one, and see your best for each.
  - *Name them all*: type every country you can from memory, for the whole world or one continent, against the clock.
  - *Flag quiz*: which country has this flag?
  - *Name that country*: a country lights up on the globe; which one is it?
  - *Shape quiz*: name the country from its outline.

  Games played in rounds are Easy (big countries, four answers to pick from), Medium (all but the smallest), Hard (all 197) or All countries (every one of the 197, one after another; stop whenever you like). Beyond Easy you type answers with no suggestions; any known spelling counts ("East Timor", "Burma", "Ceylon"), punctuation and spacing don't matter, and the answer shows the name used today. Tiny countries that are answers get a dot so you can see them.
- **Design**: switch the globe between Classic, Political (neighbors always in different colors), Night, Vintage and Minimal.

The globe spins on its own until you touch it, and again once it's been left alone for 30 seconds. Tiny countries and islands get a ring marker, and clicks just beside a small island still count.

Visited places, states and cities, best scores, the design and the settings are saved in your browser (`localStorage`). Nothing is sent anywhere.

Built with React, TypeScript and Vite, using [react-globe.gl](https://github.com/vasturiano/react-globe.gl) (three.js) for the globe, [world-atlas](https://github.com/topojson/world-atlas) (Natural Earth 1:50m) for country shapes and [flag-icons](https://github.com/lipis/flag-icons) for flags (bundled locally, so no requests go to third parties).

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
| `npm run test:coverage` | Unit and component tests with a coverage report |
| `npm run test:e2e` | End-to-end tests against the real WebGL globe (Playwright) |
| `npm run data:map` | Regenerate `src/data/countries-50m.json` (the country shapes, with lakes cut out) |
| `npm run data:extra` | Regenerate `src/data/extra-countries.json` (places too small for the 1:50m map) |
| `npm run data:regions` | Regenerate `src/data/regions.json` (states and provinces) |
| `npm run data:facts` | Download capitals, population and area from the World Bank into `src/data/country-facts.json` |
| `npm run data:cities` | Regenerate `src/data/cities.json` (each place's big and well-known cities) |

The first time you run the end-to-end tests, install the browser:

```bash
npx playwright install chromium
```

## How it works

```
src/
  App.tsx              ties it together: globe, hover/selection, menu, games, camera flights
  CountryPanel.tsx     panel shown for the selected country
  RegionPicker.tsx     its states to tick off
  CityPicker.tsx       its cities to tick off
  FlagCorner.tsx       hovered country's flag, bottom-right
  Tooltip.tsx          country name that follows the mouse
  countries.ts         every place: shape, names, codes, size, map color; lookup by point or name
  flags.ts             country → flag image URL
  data/
    names.ts           display names, alternative spellings, countries vs territories
    continents.ts      each place's continent
    westernSahara.ts   shows all of Western Sahara (see below)
    countries-50m.json    the country shapes, with lakes cut out
    extra-countries.json  Tuvalu and Gibraltar, from the 1:10m map
    regions.ts         states and provinces: names, lookup, loading (shapes in regions.json)
    facts.ts           capital, population and area (data in country-facts.json)
    cities.ts          big and well-known cities: loading, lookup (data in cities.json)
  storage.ts           state saved in the browser
  nav/                 the menu and the side panel
  explore/             tips and settings
  visited/             visited countries, states and cities
  design/              design picker
  games/               game rules (games.ts, letterGame.ts), what the globe shows (globeView.ts),
                       state and best scores (useGame.ts), the panel, answer box and outlines
  globe/
    sphereMesh.ts      triangulating countries on the sphere
    countryLayer.ts    all countries merged into one mesh, plus borders and markers; the raised country
    regionLayer.ts     states and provinces drawn over their country
    pinLayer.ts        pins on visited cities, and finding the pin under the pointer
    colors.ts          which color each country gets (game answers > hover > visited > land)
    themes.ts          the designs
    hooks.ts           the layers, pointer picking, depth precision, idle spin
    interaction.ts     click-vs-drag, flight duration/altitude, easing
    picking.ts         screen position → lat/lng on the globe
    style.ts           heights
e2e/                   Playwright tests
scripts/               data extraction
```

A few choices keep the globe smooth:

- **One mesh for all countries.** The globe library's polygon layer draws each country piece separately (~1,500 meshes, 7,500+ draw calls per frame). Instead, every country is merged into a single mesh. Each country keeps its own range of vertex colors, so hover and game answers recolor it in place. The selected country is drawn separately, slightly raised with walls.
- **Our own triangulation.** Each polygon is projected with a gnomonic projection centered on it (great circles become straight lines), triangulated with earcut so it follows the coast exactly, then subdivided until no edge is longer than 3° so the flat triangles hug the sphere. This works across the antimeridian and around the poles, builds the whole world in ~60 ms, and avoids the gaps the globe library's triangulation left in countries like Greenland.
- **Depth precision.** The camera's near plane moves out as you zoom out, so the land never flickers against the ocean below it.
- **No mesh raycasting.** Hover and click intersect a ray with the globe's sphere, then look up which country contains that lat/lng (about 0.1 ms), forgiving a few pixels near markers and coasts.
- **Eased auto-rotate.** The idle spin eases in and out, stops on any interaction, and resumes after 30 seconds untouched.

## Country data

The map has 243 places: the 197 countries (the 193 UN members, the observer states Vatican City and Palestine, and Kosovo and Taiwan) and 46 territories and other areas, such as Greenland, Puerto Rico, Hong Kong, Western Sahara and Antarctica.

Each place has:

- `name`: the display name, e.g. "Eswatini". The map data (Natural Earth) abbreviates names ("Dem. Rep. Congo") and writes "eSwatini", the styling the kingdom itself uses; we show full current English short names.
- `mapName`: the name in the map data.
- `aliases`: every other name it goes by, from ISO and a curated list of former and common names ("Swaziland", "East Timor", "Ivory Coast").
- `kind`: `"country"` or `"territory"`.
- `continent`: from flag-icons' country data, with the Caribbean islands it places in South America (Aruba, Curaçao, Bonaire, Trinidad and Tobago) counted as North America, as usual. Russia and Cyprus are in Europe; Türkiye, Georgia, Armenia and Azerbaijan in Asia.
- `isoCode` and `isoAlpha2`: ISO 3166-1 codes (`"208"`, `"DK"`). A few disputed areas have none (`null`); Kosovo uses the widely adopted `"XK"`.
- `centroid`, `extent` and `areaKm2`: center and size of the main landmass, and the area.
- `tiny`: under 2,500 km², so it gets a marker.
- `mapColor`: 0–4, never shared with a neighbor.

Some corrections to the map data:

- **Lakes.** Natural Earth's country shapes cover their lakes (lakes are a separate layer), so the Great Lakes, Lake Victoria and Baikal would be land. `scripts/extract-map.mjs` cuts its 275 lakes at 1:50m out of the countries, and `extract-regions.mjs` out of the states, so they show as water and pointing at them finds no country. The cutting is done with Clipper on the map's own grid: every other point stays exactly where it was (so neighbors still share their borders), and points along borders that follow a parallel, like the 49th between the USA and Canada, are kept, as without them those borders would bulge into great circles on the globe. Borders that ran through lakes are now lake shores.
- **Western Sahara.** Natural Earth draws only the inland strip east of the Moroccan sand wall as Western Sahara and counts the coast as Morocco. We show the whole territory, bordering Morocco along 27°40′N, as the UN and most maps do.
- **Tuvalu and Gibraltar** are too small for the 1:50m map and are copied from the 1:10m map.
- **The Maldives** are in the map but are a few tiny atolls, so like other small places they get a marker.

Capitals, population (2024) and total area come from the [World Bank's open data](https://data.worldbank.org/) (CC BY 4.0). Places it doesn't cover (Taiwan, Vatican City, Western Sahara, Somaliland, Northern Cyprus and several territories) use recent censuses and estimates from `src/data/country-facts-extra.json`, marked as estimates in the app. Somalia's and Cyprus's figures include Somaliland and Northern Cyprus.

Cities come from [GeoNames](https://www.geonames.org/) (CC BY 4.0), via [all-the-cities](https://github.com/zeke/all-the-cities). For each place, `scripts/extract-cities.mjs` keeps the capital, every city of a million or more, the next biggest (more for more populous countries, from 50,000 people), and a hand-picked list of famous smaller ones (Venice, Key West, Chefchaouen…), leaving out suburbs within 25 km of a city already picked. GeoNames often uses local spellings, so the script has English names for well-known cities ("Cologne", not "Köln") and leaves out transliteration marks; it also has a short list of GeoNames entries that are districts, camps or campuses rather than cities. Overseas regions like Réunion are listed under the country the map draws them in.

Lakes come from Natural Earth's 1:50m lakes, also via sane-topojson.

States and provinces come from Natural Earth's 1:50m states and provinces, which covers the USA (50 states and D.C.), Canada, Australia and Brazil. They're copied out of [sane-topojson](https://github.com/etpinard/sane-topojson) (MIT) and load in the background after the globe. More countries would need Natural Earth's much larger 1:10m dataset.

## Commit messages

This repo uses [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
