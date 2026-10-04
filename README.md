# Meridian: Countries of the World

An interactive 3D globe: spin it, hover a country to see its name and flag, click it to fly there and see its capital, inhabitants and area.

The design (navy and amber, after a mock-up made in Lovable) has a top bar with the four tabs, where the globe is looking and how many places you've visited. The selected country shows on the left: its ISO code, capital, inhabitants and area, the cities you've visited there, its states, and a button to put it in your visited atlas. The open tab's cards are on the right. On phones the tabs move to the bottom and panels open as sheets.

- **Explore**: two round buttons in the corner, so the globe has the room. The magnifying glass opens a search of the whole atlas, countries by any name and cities. The layers button opens the designs as swatches and the layers to show or hide (visited countries, visited states, city pins, flights, rings around small islands, day and night). On phones both are shown in the sheet.

  **Day and night** (off until switched on) darkens the side of the globe where the sun has set, as it is right now, fading through twilight down to 18° below the horizon, and lights the cities there, bigger for more people. It moves on every minute, and is hidden during games. Where the sun is overhead comes from the Astronomical Almanac's low-precision formulas (`src/globe/sun.ts`), good to about 0.01°.
- **Visited**: switch between your countries and your flights, each with a small box of figures. Keep track of where you've been, out of the world's 197 countries, with the count and percentage for each continent (territories are counted separately). Your places are listed by continent. Search to add places (old names like "Swaziland" work too), or click a country and press "Add to visited atlas". They're colored on the globe.

  For the USA, Canada, Australia and Brazil you can also mark the states, provinces and territories you've visited: click "… states explored" in the country's panel and tick them, or click them on the globe. They're drawn over the country in a darker shade.

  A visited country's panel has its visits: add each one as a month and year, or just the year if you don't remember the month. The Visited list shows the latest ("3 visits, last May 2023").

  Every country's panel also has its visited cities, and a box to add more from its big and well-known cities (focus it to see the biggest). Each city you've visited gets a pin on the globe; point at a pin to see the city's name, or click it to open its country. Adding a city also marks its country, and its state, as visited.

  Under Flights, add the flights you've taken, between airports: every international airport, and the regional ones with airline service (3,244 in all). Search by city, airport name or code ("Copenhagen", "Heathrow", "CPH"); each result shows the airport's name and country. "From" then starts where the last flight landed, and ⇅ swaps them for the flight back. A flight can have a month and year too ("When"), kept for the next leg of the trip, or added later with "Add date" in the list, which is ordered by date, newest first. Each route is drawn on the globe as a thin arc, rising with the distance, with a little plane flying along it from where the flight left, turned the way it's going; a route flown both ways or more than once is drawn once. The figures are how many flights, how far as the plane flies, and how many times around the Earth that makes. Click a flight to see its route from above, highlighted, until you press Escape or click the globe. Adding a flight doesn't mark its cities as visited: changing planes isn't visiting. (The first flights were saved between cities; they move to the city's main airport by themselves.)
- **Games**:
  - *Find the country*: click the named country on the globe, with three tries (3, 2 or 1 points). Hard leaves out the 49 biggest countries.
  - *Letter hunt*: click every country starting with a letter. Each letter belongs to one difficulty (easy D F H J K R U V Z, medium A E G I L N P T, hard B C M S); pick any letter, or a random one, and see your best for each. Every small island country and tiny country gets a ring, so the ones out in the ocean can be found (all of them, so the rings give nothing away); a ring turns green once found.
  - *Name them all*: type every country you can from memory, for the whole world or one continent, against the clock.
  - *Flag quiz*: which country has this flag?
  - *Name that country*: a country lights up on the globe; which one is it?
  - *Shape quiz*: name the country from its outline.
  - *Capital quiz*: what's the capital of the country lit up on the globe? Typed answers take older names ("Kiev") and every capital of countries with several (Pretoria, Cape Town or Bloemfontein). Israel and Palestine are left out, as their capitals are disputed and a quiz would have to take a side.
  - *Higher or lower*: you see one country's population (or area); does the next have more or fewer? Each right guess makes that country the one to beat, and the first wrong one ends the run. Both countries light up on the globe, and the longest streak is kept for population and for area.

  Games played in rounds (all but the letter hunt, "name them all" and higher or lower) are Easy (big countries, four answers to pick from), Medium (all but the smallest), Hard (all 197) or All countries (every one of the 197, one after another; stop whenever you like). Beyond Easy you type answers with no suggestions; any known spelling counts ("East Timor", "Burma", "Ceylon"), punctuation and spacing don't matter, and the answer shows the name used today. Tiny countries that are answers get a dot so you can see them. Rounds have an "I don't know" button that shows the answer; the round counts as wrong. Every game is about the 197 countries only: clicking or typing a territory (Greenland, Puerto Rico…) counts neither way, and territories don't light up under the pointer or get a ring.

  A clock runs while you play. Perfect runs set a time record to beat, next to the best score: every point (in *Find the country*, every country on the first try), no wrong letters in the letter hunt, and played to the end. Being fast with a mistake doesn't count. The clock stops at the last answer, not when you look at the results. Higher or lower keeps its longest streak instead.
- **Design**: switch the globe between Midnight (the default), Classic, Vintage, Political (neighbors always in different colors), Night and Minimal. The layers are here too.
- **Settings**: back up everything to a file, or restore a backup (below), and how to make the globe your Mac's screensaver.

The globe spins on its own until you touch it, and again once it's been left alone for 30 seconds. Tiny countries and islands get a ring marker, and clicks just beside a small island still count, also with the rings hidden. Zoomed in, tiny places reach 3.5 km around them, so pointing near Vatican City finds it (at this map's scale it's drawn 1.6 km from where it is). Only a pin's head answers to the pointer, so what's under its stem stays clickable. City pins fade out as they near the edge of the globe.

## Screensaver

The globe can be your Mac's screensaver, spinning with your places on it. With `?screensaver` in the address the app shows only the globe, and the pointer doesn't stop it. It looks at the globe from just north of the equator, so as it turns you see Europe and Canada but also Australia and New Zealand, and its pins stay until closer to the edge. A screensaver keeps its own storage, so the address carries your places, flights, design and layers in its `#places=…` part.

1. Run `npm run build:screensaver`. It builds the app into one self-contained file, `screensaver/index.html`, that opens from disk without a server, and copies it to `/Users/Shared/Meridian/` (screensavers can't read Documents, Desktop or Downloads).
2. Install [WebViewScreenSaver](https://github.com/liquidx/webviewscreensaver) (Apache 2.0), which shows a web page as a screensaver: `brew install --cask webviewscreensaver`. (Its README adds `--no-quarantine`, but current Homebrew no longer has that option; macOS asks you to allow the screensaver instead, below.)
3. Open System Settings › Wallpaper and click Screen Saver…. Scroll down to Other, all the way to the right, and pick WebViewScreenSaver.
4. The first time, macOS blocks it: in System Settings › Privacy & Security, allow it on the message there.
5. Back in Screen Saver, click Options and paste the screensaver address, which the app's Settings tab copies for you.

The screensaver doesn't update by itself. After changing your places or design, copy the address again and paste it in Options; after changing the app, run `npm run build:screensaver` again.

## Backup

Visited places and when you went, states, cities and flights, best scores and times, the design and the settings are saved in your browser (`localStorage`). Nothing is sent anywhere, so clearing the browser's site data, or moving to another browser or computer, would leave them behind. In the Settings tab, **Download backup** saves all of it to a file (`meridian-backup-2026-10-04.json`, readable JSON), and shows when you last did. **Restore from a backup…** reads one, says what it holds and when it was made, and only replaces what's in this browser when you confirm. Every part of the file is checked the way the app checks it when loading, so a damaged or foreign file is refused as a whole rather than half restored.

Built with React, TypeScript and Vite, using [react-globe.gl](https://github.com/vasturiano/react-globe.gl) (three.js) for the globe, [world-atlas](https://github.com/topojson/world-atlas) (Natural Earth 1:50m) for country shapes and [flag-icons](https://github.com/lipis/flag-icons) for flags. The fonts are Fraunces, Inter and JetBrains Mono (SIL Open Font License), from Fontsource. Flags and fonts are bundled, so no requests go to third parties.

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
| `npm run build:screensaver` | Build the screensaver file and copy it to `/Users/Shared/Meridian/` (see Screensaver) |
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
| `npm run data:airports` | Download the airports with scheduled flights from OurAirports into `src/data/airports.json` |

The first time you run the end-to-end tests, install the browser:

```bash
npx playwright install chromium
```

## Tests

- **Unit and component tests** (Vitest and Testing Library, in jsdom): the data, the game rules, the globe's layers against a real three.js camera, every panel, and the whole app with a stand-in for the WebGL globe. About 630 tests, covering over 99% of the lines.
- **End-to-end tests** (Playwright): the real app with its WebGL globe in headless Chromium, on a desktop and a phone (touch, tab bar, sheets): hovering and clicking countries, visited places, states, cities and flights kept after reloading, the settings, a backup downloaded and restored, the designs, every game, and the screensaver.

`.github/workflows/tests.yml` runs all of it on GitHub for every pull request and every push to `main`: lint, the unit tests, the build (which type-checks), and the end-to-end tests.

## How it works

```
src/
  App.tsx              ties it together: globe, hover/selection, menu, games, camera flights
  CountryPanel.tsx     panel shown for the selected country
  RegionPicker.tsx     its states to tick off
  CityPicker.tsx       its visited cities, and a box to add more
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
    airports.ts        airports with scheduled flights: loading, search (data in airports.json)
    flights.ts         flights: distances, figures, routes, moving old city flights to airports
  storage.ts           state saved in the browser
  screensaver.ts       the screensaver mode, and carrying your places in its address
  ui/                  the cards with "(B) GAMES ··· 06" headers, and the boxes of figures
  nav/                 the top bar, tabs, the column of cards on the right
  explore/             the Explore tools: atlas search, design and layers; settings
  visited/             visited countries, states and cities; flights, and the airport search
  design/              design picker, and how to set up the screensaver
  settings/            backups: making, checking and restoring them, and their card
  games/               game rules (games.ts, letterGame.ts, higherLower.ts), what the globe shows (globeView.ts),
                       state and best scores (useGame.ts), perfect runs and their times (records.ts),
                       the panel, answer box and outlines
  globe/
    sphereMesh.ts      triangulating countries on the sphere
    countryLayer.ts    all countries merged into one mesh, plus borders and markers; the raised country
    regionLayer.ts     states and provinces drawn over their country
    pinLayer.ts        pins on visited cities, and finding the pin under the pointer
    flightLayer.ts     flight routes as arcs, with planes flying along them
    colors.ts          which color each country gets (game answers > hover > visited > land)
    themes.ts          the designs
    hooks.ts           the layers, pointer picking, depth precision, idle spin
    interaction.ts     click-vs-drag, flight duration/altitude, easing
    picking.ts         screen position → lat/lng on the globe
    style.ts           heights
e2e/                   Playwright tests
scripts/               data extraction
.github/workflows/     the tests, run on GitHub
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
- `island`: shares no land border, so (under 30,000 km²) it gets a ring in the letter hunt.
- `mapColor`: 0–4, never shared with a neighbor.

Some corrections to the map data:

- **Lakes.** Natural Earth's country shapes cover their lakes (lakes are a separate layer), so the Great Lakes, Lake Victoria and Baikal would be land. `scripts/extract-map.mjs` cuts its 275 lakes at 1:50m out of the countries, and `extract-regions.mjs` out of the states, so they show as water and pointing at them finds no country. The cutting is done with Clipper on the map's own grid: every other point stays exactly where it was (so neighbors still share their borders), and points along borders that follow a parallel, like the 49th between the USA and Canada, are kept, as without them those borders would bulge into great circles on the globe. Borders that ran through lakes are now lake shores.
- **Borders as the UN counts them.** Natural Earth draws borders as they are on the ground. Where the UN counts land as another country's, `scripts/un-borders.mjs` follows the UN: Crimea is Ukraine's (General Assembly resolution 68/262), the Golan Heights are Syria's (Security Council resolution 497, cut along the 1967 line), the Chagos Archipelago is Mauritius's (resolution 73/295), and Somaliland and Northern Cyprus, which run themselves but are recognized by few countries, are part of Somalia and Cyprus. The countries involved say so in their panels. Disputes the UN takes no side in, like Kashmir, stay as drawn. Kosovo and Taiwan, which aren't UN members, are kept as countries, as in most lists of the world's 197.
- **Western Sahara.** Natural Earth draws only the inland strip east of the Moroccan sand wall as Western Sahara and counts the coast as Morocco. We show the whole territory, bordering Morocco along 27°40′N, as the UN and most maps do.
- **Tuvalu and Gibraltar** are too small for the 1:50m map and are copied from the 1:10m map.
- **The Maldives** are in the map but are a few tiny atolls, so like other small places they get a marker.
- **Monaco's area.** The World Bank gives 75 km²; it's about 2 km², set in `country-facts-extra.json`.

Capitals, population (2024) and total area come from the [World Bank's open data](https://data.worldbank.org/) (CC BY 4.0). Places it doesn't cover (Taiwan, Vatican City, Western Sahara and several territories) use recent censuses and estimates from `src/data/country-facts-extra.json`, marked as estimates in the app. Somalia's and Cyprus's figures include Somaliland and Northern Cyprus.

Cities come from [GeoNames](https://www.geonames.org/) (CC BY 4.0), via [all-the-cities](https://github.com/zeke/all-the-cities). For each place, `scripts/extract-cities.mjs` keeps the capital, every city of a million or more, the next biggest (more for more populous countries, from 50,000 people), and a hand-picked list of famous smaller ones (Venice, Key West, Chefchaouen…), leaving out suburbs within 25 km of a city already picked. GeoNames often uses local spellings, so the script has English names for well-known cities ("Cologne", not "Köln") and leaves out transliteration marks; it also has a short list of GeoNames entries that are districts, camps or campuses rather than cities. Overseas regions like Réunion are listed under the country the map draws them in. A few places the all-the-cities extract leaves out (Vilanculos) are added by hand, with their GeoNames ids.

Airports come from [OurAirports](https://ourairports.com/data/) (public domain): `scripts/fetch-airports.mjs` keeps the large and medium airports with scheduled airline service and an IATA code, which covers every international airport.

Lakes come from Natural Earth's 1:50m lakes, also via sane-topojson.

States and provinces come from Natural Earth's 1:50m states and provinces, which covers the USA (50 states and D.C.), Canada, Australia and Brazil. They're copied out of [sane-topojson](https://github.com/etpinard/sane-topojson) (MIT) and load in the background after the globe. More countries would need Natural Earth's much larger 1:10m dataset.

## Commit messages

This repo uses [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
