// Picks the big and well-known cities of every place on the map from
// GeoNames (via all-the-cities; data CC BY 4.0), so they can be marked as
// visited.
//
//   npm run data:cities
//
// Per place: the capital, every city of a million or more, the biggest
// others (more for more populous countries), and some famous smaller ones;
// leaving out districts and suburbs of a bigger city already picked. Names
// are in English where it has its own ("Cologne", not "Köln").
import { readFile, writeFile } from 'node:fs/promises'
import cities from 'all-the-cities'
import { geoDistance } from 'd3-geo'

const OUTPUT = new URL('../src/data/cities.json', import.meta.url)
const facts = JSON.parse(await readFile(new URL('../src/data/country-facts.json', import.meta.url), 'utf8'))

/** Smaller cities people know, by country code */
const FAMOUS = {
  AR: ['Ushuaia', 'Mendoza', 'San Carlos de Bariloche', 'Salta', 'El Calafate'],
  AT: ['Salzburg', 'Innsbruck'],
  AU: ['Cairns', 'Darwin', 'Hobart', 'Alice Springs', 'Byron Bay'],
  BA: ['Mostar'],
  BE: ['Bruges', 'Ghent'],
  BO: ['Sucre'],
  BR: ['Florianópolis', 'Ouro Preto'],
  CH: ['Lucerne', 'Interlaken', 'Zermatt'],
  CL: ['Valparaíso', 'Punta Arenas', 'Puerto Natales', 'San Pedro de Atacama'],
  CN: ['Guilin', 'Lhasa', 'Sanya', 'Lijiang', 'Zhangjiajie', 'Hohhot', 'Luoyang'],
  CU: ['Trinidad', 'Varadero'],
  CY: ['Famagusta', 'Kyrenia'],
  CZ: ['Český Krumlov'],
  DE: ['Heidelberg', 'Dresden', 'Potsdam', 'Freiburg', 'Rothenburg ob der Tauber', 'Garmisch-Partenkirchen'],
  DK: ['Roskilde', 'Helsingør', 'Skagen'],
  EG: ['Giza', 'Hurghada', 'Sharm el-Sheikh', 'Dahab'],
  ES: [
    'Granada', 'Córdoba', 'Toledo', 'Ibiza', 'San Sebastián', 'Santiago de Compostela', 'Salamanca', 'Marbella',
    'Benidorm', 'Ronda',
  ],
  FJ: ['Nadi'],
  FR: [
    'Cannes', 'Avignon', 'Chamonix-Mont-Blanc', 'Versailles', 'Annecy', 'Biarritz', 'Carcassonne', 'Saint-Tropez',
    'Ajaccio',
  ],
  GB: ['Oxford', 'Cambridge', 'Bath', 'Inverness', 'Belfast', 'York', 'Brighton', 'Aberdeen'],
  GR: ['Fira', 'Oia', 'Mykonos', 'Rhodes'],
  HR: ['Dubrovnik', 'Split'],
  ID: ['Denpasar', 'Ubud'],
  IN: [
    'Agra', 'Varanasi', 'Panaji', 'Udaipur', 'Rishikesh', 'Kochi', 'Mysore', 'Jodhpur', 'Jaisalmer',
    'Shimla', 'Leh',
  ],
  IS: ['Akureyri'],
  IT: [
    'Venice', 'Pisa', 'Siena', 'Amalfi', 'Como', 'Positano', 'Sorrento', 'Bergamo', 'Lucca', 'Assisi', 'Taormina',
    'Capri', 'Cagliari', 'Ravenna', 'Perugia',
  ],
  JO: ['Aqaba', 'Petra'],
  JP: ['Nara', 'Kanazawa'],
  KH: ['Siem Reap'],
  LA: ['Luang Prabang'],
  MA: ['Chefchaouen', 'Essaouira'],
  ME: ['Kotor', 'Budva'],
  MX: ['Cancún', 'Oaxaca', 'Tulum', 'Playa del Carmen'],
  MY: ['George Town', 'Malacca'],
  NL: ['The Hague', 'Haarlem', 'Delft'],
  NO: ['Tromsø', 'Bergen'],
  NP: ['Pokhara'],
  NZ: ['Queenstown', 'Rotorua'],
  PE: ['Cusco', 'Arequipa'],
  PT: ['Porto', 'Faro', 'Funchal'],
  SI: ['Bled', 'Piran'],
  TH: ['Chiang Mai', 'Phuket', 'Krabi', 'Pattaya'],
  TR: ['Antalya', 'Göreme'],
  TZ: ['Zanzibar', 'Arusha'],
  US: [
    'Miami', 'New Orleans', 'Orlando', 'Honolulu', 'Anchorage', 'Salt Lake City', 'Santa Fe', 'Key West',
    'Las Vegas', 'Atlanta', 'Nashville', 'Baltimore', 'Minneapolis', 'St. Louis', 'Pittsburgh', 'Tampa',
    'Sacramento', 'Kansas City', 'Milwaukee', 'Cleveland', 'Savannah',
  ],
  VN: ['Hoi An', 'Hue', 'Da Lat'],
  MZ: ['Inhambane', 'Vilanculos'],
  ZA: ['Stellenbosch', 'Nelspruit'],
}

/** English names for cities GeoNames spells the local way, by country code */
const ENGLISH = {
  AE: { 'Ras Al Khaimah City': 'Ras Al Khaimah', 'Al Fujairah City': 'Fujairah', 'Umm Al Quwain City': 'Umm Al Quwain', 'Al Ain City': 'Al Ain' },
  BE: { Antwerpen: 'Antwerp', Gent: 'Ghent', Brugge: 'Bruges' },
  BY: { "Homyel'": 'Gomel' },
  CA: { Montréal: 'Montreal', Québec: 'Quebec City' },
  CH: { Genève: 'Geneva', Zürich: 'Zurich', Luzern: 'Lucerne', 'Sankt Gallen': 'St. Gallen' },
  DE: { Köln: 'Cologne', Nürnberg: 'Nuremberg', 'Frankfurt am Main': 'Frankfurt' },
  DK: { Århus: 'Aarhus' },
  EG: {
    Tanda: 'Tanta', Asyuţ: 'Asyut', 'Al Maḩallah al Kubrá': 'El Mahalla El Kubra', Ḩalwan: 'Helwan', 'Al Fayyum': 'Faiyum',
    Qina: 'Qena', 'Al Minya': 'Minya', 'Bani Suwayf': 'Beni Suef', 'Kafr ash Shaykh': 'Kafr El Sheikh',
    'Shibin al Kawm': 'Shibin El Kom', Idfu: 'Edfu',
  },
  ES: { Sevilla: 'Seville', 'Donostia / San Sebastián': 'San Sebastián', 'Gasteiz / Vitoria': 'Vitoria-Gasteiz' },
  ET: { "Mek'ele": 'Mekelle', Nazret: 'Adama' },
  GE: { 'P’ot’i': 'Poti', 'Ts’khinvali': 'Tskhinvali' },
  GR: {
    Thessaloníki: 'Thessaloniki', Pátra: 'Patras', Lárisa: 'Larissa', Irákleion: 'Heraklion', Ioánnina: 'Ioannina',
    Tríkala: 'Trikala', Sérres: 'Serres', Ródos: 'Rhodes', Kavála: 'Kavala', Chaniá: 'Chania', Kateríni: 'Katerini',
    Chalkída: 'Chalcis', Firá: 'Fira (Santorini)', Oía: 'Oia',
  },
  ID: { 'City of Balikpapan': 'Balikpapan' },
  IE: { Luimneach: 'Limerick', Gaillimh: 'Galway' },
  IN: { Allahabad: 'Prayagraj', Cochin: 'Kochi' },
  IQ: { Basrah: 'Basra', 'As Sulaymaniyah': 'Sulaymaniyah' },
  IR: { Orumiyeh: 'Urmia' },
  IT: { Padova: 'Padua' },
  KP: { Hamhŭng: 'Hamhung', 'Namp’o': 'Nampo', Kaesŏng: 'Kaesong', Wŏnsan: 'Wonsan', Sariwŏn: 'Sariwon', Sinŭiju: 'Sinuiju', 'Sunch’ŏn': 'Sunchon' },
  KR: { Chinju: 'Jinju', 'Cheongju-si': 'Cheongju' },
  KZ: { 'Nur-Sultan': 'Astana', Karagandy: 'Karaganda' },
  LB: { Jbaïl: 'Byblos' },
  LY: { Mişratah: 'Misrata' },
  MA: { Chefchaouene: 'Chefchaouen', Fès: 'Fez', 'Oujda-Angad': 'Oujda', 'El Jadid': 'El Jadida' },
  MM: { 'Nay Pyi Taw': 'Naypyidaw' },
  MN: { 'Ulan Bator': 'Ulaanbaatar' },
  MV: { Male: 'Malé' },
  MX: {
    Juárez: 'Ciudad Juárez', 'León de los Aldama': 'León', Tuxtla: 'Tuxtla Gutiérrez', 'Heroica Matamoros': 'Matamoros',
    'Victoria de Durango': 'Durango', 'Acapulco de Juárez': 'Acapulco', 'Santiago de Querétaro': 'Querétaro',
    'Xalapa de Enríquez': 'Xalapa',
  },
  PA: { Panamá: 'Panama City' },
  PH: { Davao: 'Davao City' },
  PK: { Shekhupura: 'Sheikhupura' },
  PS: { Gaza: 'Gaza City' },
  RU: { 'Nizhniy Novgorod': 'Nizhny Novgorod', 'Rostov-na-Donu': 'Rostov-on-Don', 'Tol’yatti': 'Tolyatti' },
  SA: { 'Ta’if': 'Taif' },
  SE: { Göteborg: 'Gothenburg' },
  SO: { Gaalkacyo: 'Galkayo', Garoowe: 'Garowe', Marka: 'Merca', Hargeysa: 'Hargeisa' },
  SY: { Ḩamah: 'Hama', 'Ar Raqqah': 'Raqqa', 'Dar‘a': 'Daraa', Tartouss: 'Tartus', 'Al Ḩasakah': 'Hasakah' },
  TH: { 'Chon Buri': 'Chonburi' },
  TJ: { Qŭrghonteppa: 'Bokhtar', Kŭlob: 'Kulob' },
  UA: { Odessa: 'Odesa', Zaporizhia: 'Zaporizhzhia', Mykolayiv: 'Mykolaiv' },
  UZ: { Andijon: 'Andijan', Tirmiz: 'Termez', Urganch: 'Urgench', Jizzax: 'Jizzakh' },
  VN: { 'Ðà Lạt': 'Da Lat', Huế: 'Hue' },
  YE: { 'Al Ḩudaydah': 'Hodeidah', 'Ta‘izz': 'Taiz' },
  ZA: { 'Port Elizabeth': 'Gqeberha (Port Elizabeth)', Nelspruit: 'Mbombela (Nelspruit)' },
}

/** Suburbs, districts, camps and other places GeoNames lists as cities, by country code */
const NOT_CITIES = {
  AE: ['Bani Yas City', 'Zayed City', 'Al Shamkhah City'],
  BD: ['Shibganj', 'Nagarpur', 'Par Naogaon'],
  BE: ['Heist-op-den-Berg', 'Maasmechelen'],
  CN: ['Dadonghai', 'Nanchong', 'Puyang', 'Tianshui', 'Shiyan', 'Yunfu', 'Bayan Nur'],
  CR: ['San Rafael Abajo'],
  FR: ['Cergy-Pontoise'],
  GH: ['Japekrom'],
  HT: ['Thomazeau'],
  ID: ['Situbondo'],
  IN: ['Najafgarh', 'Nowrangapur'],
  IR: ['Pasragad Branch', 'Kahriz'],
  IT: ['Mestre'], // part of Venice
  JO: ['Rukban', '‘Izra'],
  KP: ['Yuktae-dong'],
  LY: ['Al Ajaylat'],
  MM: ['Kyain Seikgyi Township'],
  MN: ['Murun-kuren'],
  MX: ['Cuautitlán Izcalli'],
  NG: ['Lekki'],
  PH: ['Budta', 'Magugpo Poblacion'],
  PT: ['Monsanto', 'Felgueiras'],
  SN: ['Tiébo'],
  TH: ['Khlong Luang'],
  TJ: ['Moskovskiy'],
  TN: ['Douane'],
  TT: ['Mon Repos'],
  TZ: ['Katumba'],
  VE: ['Santa Teresa del Tuy'],
}

// Districts, abandoned, historical and destroyed places aren't cities to visit
const SKIP = new Set(['PPLX', 'PPLH', 'PPLQ', 'PPLW', 'PPLCH', 'STLMT'])
const CAPITAL = new Set(['PPLC', 'PPLG'])
const NEARBY_KM = 25
const MILLION = 1_000_000
/** Smaller cities need to be capitals or famous */
const MIN_POPULATION = 50_000
/** Even China gets no more than this many for their size */
const MAX_OTHERS = 40
const EARTH_KM = 6371

const topCount = (population) => (population > 100e6 ? 25 : population > 30e6 ? 18 : population > 10e6 ? 12 : 8)

/** For comparing names: lowercase, no accents or punctuation */
const key = (name) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')

/**
 * The English name: from ENGLISH, else GeoNames' without the transliteration
 * marks English leaves out ("Sūrat" → "Surat", "Ḩims" → "Hims", "‘Ibri" →
 * "Ibri"). Real accents stay ("Málaga").
 */
function englishName(place, name) {
  let clean = name
    .normalize('NFD')
    .replace(/\u0304|\u0323/g, '') // macrons and dots below
    .replace(/([Hh])\u0327/g, '$1') // the cedilla under H
    .replace(/i\u0307/g, 'i') // a dot over a dotted i
    .normalize('NFC')
    .replace(/^‘/, '')
    .replace(/‘/g, "'")
  // Romanian writes ș and ț with a comma, not a cedilla
  // Japanese city names sometimes carry "-shi", city
  if (place === 'JP') clean = clean.replace(/-shi$/, '')
  if (place === 'RO' || place === 'MD') clean = clean.replace(/ş/g, 'ș').replace(/Ş/g, 'Ș').replace(/ţ/g, 'ț').replace(/Ţ/g, 'Ț')
  return ENGLISH[place]?.[name] ?? ENGLISH[place]?.[clean] ?? clean
}

const isCapitalName = (place) => {
  const wanted = facts[place]?.capital
  return (city) => {
    const name = key(city.name)
    return !!wanted && name !== '' && (name === key(wanted) || key(wanted).startsWith(name))
  }
}

/** The capital: the city matching the World Bank's capital, else the biggest one marked as a capital */
const capitalOf = (place, list) =>
  list.find(isCapitalName(place)) ?? list.find((c) => CAPITAL.has(c.featureCode)) ?? null

// Places GeoNames counts as their own that the map draws as part of another,
// like Réunion in France. Picked on their own, so they aren't crowded out by
// the bigger place's cities, then filed under it.
const PART_OF = {
  BQ: 'NL',
  CC: 'Indian Ocean Ter.',
  CX: 'Indian Ocean Ter.',
  GF: 'FR',
  GP: 'FR',
  MQ: 'FR',
  RE: 'FR',
  YT: 'FR',
  SJ: 'NO',
}

/** Cities the all-the-cities extract of GeoNames is missing, as GeoNames has them */
const MISSING = [
  { cityId: 1024683, name: 'Vilanculos', country: 'MZ', featureCode: 'PPL', population: 43183, loc: { coordinates: [35.3167, -22.0] } },
]

const byPlace = new Map()
for (const city of [...cities, ...MISSING]) {
  if (SKIP.has(city.featureCode)) continue
  // Names in another script are places GeoNames has no English name for
  if (!/[a-z]/i.test(city.name)) continue
  if (NOT_CITIES[city.country]?.includes(city.name)) continue
  const place = city.country
  if (!byPlace.has(place)) byPlace.set(place, [])
  byPlace.get(place).push(city)
}

const picked = []
const unfound = new Map(Object.entries(FAMOUS).map(([place, names]) => [place, new Map(names.map((n) => [key(n), n]))]))
for (const [place, list] of byPlace) {
  list.sort((a, b) => b.population - a.population)
  const population = facts[place]?.population ?? 0
  const famous = new Set((FAMOUS[place] ?? []).map(key))
  const kept = []
  /** Picked for their size, not as the capital or as famous */
  let others = 0
  const near = (city) =>
    kept.some((k) => geoDistance(k.loc.coordinates, city.loc.coordinates) * EARTH_KM < NEARBY_KM)
  const localCapital = capitalOf(place, list)
  // Within a bigger place, only that place's own capital is marked as the capital
  const mapPlace = PART_OF[place] ?? place
  const capital = PART_OF[place] ? (list.find(isCapitalName(mapPlace)) ?? null) : localCapital

  for (const city of list) {
    const isCapital = city === localCapital
    // Famous names may be the English or the local one ("Bruges" or "Brugge")
    const names = [key(city.name), key(englishName(place, city.name))]
    const isFamous = names.some((name) => famous.has(name))
    for (const name of names) {
      famous.delete(name) // only the biggest place of that name
      unfound.get(place)?.delete(name)
    }
    if (isCapital || isFamous) {
      kept.push(city)
      continue
    }
    const big = city.population >= MILLION || others < topCount(population)
    if (!big || city.population < MIN_POPULATION || others >= MAX_OTHERS || near(city)) continue
    kept.push(city)
    others++
  }
  for (const city of kept) {
    picked.push({
      id: city.cityId,
      name: englishName(place, city.name),
      place: mapPlace,
      lat: Math.round(city.loc.coordinates[1] * 1e4) / 1e4,
      lng: Math.round(city.loc.coordinates[0] * 1e4) / 1e4,
      population: city.population,
      ...(city === capital && { capital: true }),
    })
  }
}

const missing = [...unfound].flatMap(([place, names]) => [...names.values()].map((name) => `${name} (${place})`))
if (missing.length) console.warn(`Famous cities not found: ${missing.join(', ')}`)

await writeFile(OUTPUT, JSON.stringify(picked) + '\n')
const places = new Set(picked.map((c) => c.place))
console.log(`Wrote ${picked.length} cities in ${places.size} places to ${OUTPUT.pathname}`)
