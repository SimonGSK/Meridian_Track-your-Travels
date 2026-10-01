import enNames from 'i18n-iso-countries/langs/en.json'

/**
 * Display names, alternative spellings, and which places are countries.
 *
 * The map data (Natural Earth) abbreviates names ("Dem. Rep. Congo",
 * "St. Vin. and Gren.") and styles Eswatini as "eSwatini", as the kingdom
 * itself does. We show the full current English short names instead, and
 * accept older and alternative spellings when you type an answer.
 */

/** Natural Earth name → display name, where they differ */
export const DISPLAY_NAMES: Record<string, string> = {
  'Antigua and Barb.': 'Antigua and Barbuda',
  'Ashmore and Cartier Is.': 'Ashmore and Cartier Islands',
  'Bosnia and Herz.': 'Bosnia and Herzegovina',
  'Br. Indian Ocean Ter.': 'British Indian Ocean Territory',
  'British Virgin Is.': 'British Virgin Islands',
  'Cayman Is.': 'Cayman Islands',
  'Central African Rep.': 'Central African Republic',
  Congo: 'Republic of the Congo',
  'Cook Is.': 'Cook Islands',
  'Dem. Rep. Congo': 'Democratic Republic of the Congo',
  'Dominican Rep.': 'Dominican Republic',
  'Eq. Guinea': 'Equatorial Guinea',
  eSwatini: 'Eswatini',
  'Faeroe Is.': 'Faroe Islands',
  'Falkland Is.': 'Falkland Islands',
  'Fr. Polynesia': 'French Polynesia',
  'Fr. S. Antarctic Lands': 'French Southern and Antarctic Lands',
  'Heard I. and McDonald Is.': 'Heard Island and McDonald Islands',
  'Indian Ocean Ter.': 'Australian Indian Ocean Territories',
  Macedonia: 'North Macedonia',
  'Marshall Is.': 'Marshall Islands',
  'N. Cyprus': 'Northern Cyprus',
  'N. Mariana Is.': 'Northern Mariana Islands',
  'Pitcairn Is.': 'Pitcairn Islands',
  'S. Geo. and the Is.': 'South Georgia and the South Sandwich Islands',
  'S. Sudan': 'South Sudan',
  'São Tomé and Principe': 'São Tomé and Príncipe',
  'Solomon Is.': 'Solomon Islands',
  'St-Barthélemy': 'Saint Barthélemy',
  'St-Martin': 'Saint Martin',
  'St. Kitts and Nevis': 'Saint Kitts and Nevis',
  'St. Pierre and Miquelon': 'Saint Pierre and Miquelon',
  'St. Vin. and Gren.': 'Saint Vincent and the Grenadines',
  'Turks and Caicos Is.': 'Turks and Caicos Islands',
  Turkey: 'Türkiye',
  'U.S. Virgin Is.': 'U.S. Virgin Islands',
  'United States of America': 'United States',
  Vatican: 'Vatican City',
  'W. Sahara': 'Western Sahara',
  'Wallis and Futuna Is.': 'Wallis and Futuna',
  Åland: 'Åland Islands',
}

/** Other names people use, by display name (former names, short forms, local spellings) */
const EXTRA_ALIASES: Record<string, string[]> = {
  Belarus: ['Byelorussia', 'Belorussia'],
  Benin: ['Dahomey'],
  'Bosnia and Herzegovina': ['Bosnia'],
  'Burkina Faso': ['Upper Volta'],
  'Cabo Verde': ['Cape Verde'],
  Cambodia: ['Kampuchea'],
  China: ['PRC'],
  "Côte d'Ivoire": ['Ivory Coast'],
  Czechia: ['Czech Republic'],
  'Democratic Republic of the Congo': ['DR Congo', 'DRC', 'Congo-Kinshasa', 'Zaire'],
  Eswatini: ['Swaziland', 'eSwatini'],
  Ethiopia: ['Abyssinia'],
  'Falkland Islands': ['Falklands', 'Malvinas'],
  'Faroe Islands': ['Faroes', 'Faeroe Islands'],
  Gambia: ['The Gambia'],
  Bahamas: ['The Bahamas'],
  Iran: ['Persia'],
  Kyrgyzstan: ['Kyrgyz Republic', 'Kirghizia'],
  Laos: ['Lao PDR', 'Lao'],
  Macao: ['Macau'],
  Micronesia: ['Federated States of Micronesia', 'FSM'],
  Moldova: ['Moldavia'],
  Myanmar: ['Burma'],
  Netherlands: ['Holland'],
  'North Korea': ['DPRK', "Democratic People's Republic of Korea"],
  'North Macedonia': ['Macedonia'],
  'Northern Cyprus': ['Turkish Republic of Northern Cyprus'],
  'Republic of the Congo': ['Congo', 'Congo-Brazzaville'],
  'Saint Kitts and Nevis': ['St Kitts and Nevis', 'Saint Christopher and Nevis'],
  'Saint Lucia': ['St Lucia'],
  'Saint Vincent and the Grenadines': ['St Vincent and the Grenadines', 'St Vincent'],
  Samoa: ['Western Samoa'],
  Slovakia: ['Slovak Republic'],
  'South Korea': ['Korea'],
  'Sri Lanka': ['Ceylon'],
  Suriname: ['Surinam', 'Dutch Guiana'],
  Taiwan: ['Formosa', 'Republic of China', 'ROC'],
  Thailand: ['Siam'],
  'Timor-Leste': ['East Timor'],
  Türkiye: ['Turkey'],
  'United Arab Emirates': ['Emirates'],
  'United Kingdom': ['Britain'],
  'United States': ['America'],
  Vanuatu: ['New Hebrides'],
  'Vatican City': ['Vatican', 'Holy See'],
  Vietnam: ['Viet Nam'],
}

/** ISO names that would point at more than one place, or that we don't use, so they're left out */
const UNUSED_ISO_NAMES = new Set(['congo', 'taiwan province of china'])

/** The 193 UN member states, by ISO 3166-1 alpha-2 code */
const UN_MEMBERS = new Set(
  (
    'AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD ' +
    'CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD ' +
    'GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU ' +
    'MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PA PG PY ' +
    'PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TJ ' +
    'TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VE VN YE ZM ZW'
  ).split(' '),
)

/**
 * Also counted as countries: the two UN observer states (Vatican City,
 * Palestine), and Kosovo and Taiwan, which are widely recognised.
 */
const OTHER_COUNTRIES = new Set(['VA', 'PS', 'XK', 'TW'])

/** Map features sharing a country's ISO code without being that country */
const NOT_THE_COUNTRY = new Set(['Ashmore and Cartier Is.'])

/** Whether a place's ISO code really belongs to another place (Ashmore and Cartier Is. has Australia's) */
export const sharesCode = (mapName: string) => NOT_THE_COUNTRY.has(mapName)

export type PlaceKind = 'country' | 'territory'

export function placeKind(mapName: string, isoAlpha2: string | null): PlaceKind {
  if (!isoAlpha2 || NOT_THE_COUNTRY.has(mapName)) return 'territory'
  return UN_MEMBERS.has(isoAlpha2) || OTHER_COUNTRIES.has(isoAlpha2) ? 'country' : 'territory'
}

export const displayName = (mapName: string) => DISPLAY_NAMES[mapName] ?? mapName

/** Every name a place goes by: display name, map name, ISO names and known aliases. */
export function aliasesOf(mapName: string, isoAlpha2: string | null): string[] {
  const name = displayName(mapName)
  const isoNames =
    isoAlpha2 && !NOT_THE_COUNTRY.has(mapName) ? enNames.countries[isoAlpha2 as keyof typeof enNames.countries] : []
  const fromIso = [isoNames ?? []].flat().filter((alias) => !UNUSED_ISO_NAMES.has(normalizeName(alias)))
  return [...new Set([name, mapName, ...fromIso, ...(EXTRA_ALIASES[name] ?? [])])]
}

/**
 * Lowercase, without accents, punctuation or a leading "the", with "St."
 * spelled out and "&" as "and": "St. Kitts & Nevis" → "saint kitts and nevis".
 */
export function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[.'’]/g, '') // "U.K." → "uk", "d'Ivoire" → "divoire"
    .replace(/[,()-]/g, ' ')
    .replace(/\bst\b/g, 'saint')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^the /, '')
}

/** For matching a typed name: normalized, and spaces don't matter either ("Guinea Bissau", "Cote d Ivoire"). */
export const matchKey = (name: string) => normalizeName(name).replace(/ /g, '')
