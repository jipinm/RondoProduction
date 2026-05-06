/**
 * ISO 3166-1 alpha-3 → alpha-2 mapping.
 * Used to resolve human-readable country names via Intl.DisplayNames,
 * which only accepts alpha-2 codes.
 */
const iso3ToIso2: Record<string, string> = {
  AFG: 'AF', ALB: 'AL', DZA: 'DZ', AND: 'AD', AGO: 'AO', ARG: 'AR',
  ARM: 'AM', AUS: 'AU', AUT: 'AT', AZE: 'AZ', BHS: 'BS', BHR: 'BH',
  BGD: 'BD', BLR: 'BY', BEL: 'BE', BLZ: 'BZ', BEN: 'BJ', BTN: 'BT',
  BOL: 'BO', BIH: 'BA', BWA: 'BW', BRA: 'BR', BRN: 'BN', BGR: 'BG',
  BFA: 'BF', BDI: 'BI', CPV: 'CV', KHM: 'KH', CMR: 'CM', CAN: 'CA',
  CAF: 'CF', TCD: 'TD', CHL: 'CL', CHN: 'CN', COL: 'CO', COM: 'KM',
  COD: 'CD', COG: 'CG', CRI: 'CR', HRV: 'HR', CUB: 'CU', CYP: 'CY',
  CZE: 'CZ', DNK: 'DK', DJI: 'DJ', DOM: 'DO', ECU: 'EC', EGY: 'EG',
  SLV: 'SV', GNQ: 'GQ', ERI: 'ER', EST: 'EE', ETH: 'ET', FJI: 'FJ',
  FIN: 'FI', FRA: 'FR', GAB: 'GA', GMB: 'GM', GEO: 'GE', DEU: 'DE',
  GHA: 'GH', GRC: 'GR', GTM: 'GT', GIN: 'GN', GNB: 'GW', GUY: 'GY',
  HTI: 'HT', HND: 'HN', HUN: 'HU', ISL: 'IS', IND: 'IN', IDN: 'ID',
  IRN: 'IR', IRQ: 'IQ', IRL: 'IE', ISR: 'IL', ITA: 'IT', JAM: 'JM',
  JPN: 'JP', JOR: 'JO', KAZ: 'KZ', KEN: 'KE', PRK: 'KP', KOR: 'KR',
  KWT: 'KW', KGZ: 'KG', LAO: 'LA', LVA: 'LV', LBN: 'LB', LSO: 'LS',
  LBR: 'LR', LBY: 'LY', LIE: 'LI', LTU: 'LT', LUX: 'LU', MDG: 'MG',
  MWI: 'MW', MYS: 'MY', MDV: 'MV', MLI: 'ML', MLT: 'MT', MRT: 'MR',
  MUS: 'MU', MEX: 'MX', MDA: 'MD', MCO: 'MC', MNG: 'MN', MNE: 'ME',
  MAR: 'MA', MOZ: 'MZ', MMR: 'MM', NAM: 'NA', NPL: 'NP', NLD: 'NL',
  NZL: 'NZ', NIC: 'NI', NER: 'NE', NGA: 'NG', MKD: 'MK', NOR: 'NO',
  OMN: 'OM', PAK: 'PK', PAN: 'PA', PNG: 'PG', PRY: 'PY', PER: 'PE',
  PHL: 'PH', POL: 'PL', PRT: 'PT', QAT: 'QA', ROU: 'RO', RUS: 'RU',
  RWA: 'RW', SAU: 'SA', SEN: 'SN', SRB: 'RS', SLE: 'SL', SGP: 'SG',
  SVK: 'SK', SVN: 'SI', SOM: 'SO', ZAF: 'ZA', SSD: 'SS', ESP: 'ES',
  LKA: 'LK', SDN: 'SD', SUR: 'SR', SWZ: 'SZ', SWE: 'SE', CHE: 'CH',
  SYR: 'SY', TWN: 'TW', TJK: 'TJ', TZA: 'TZ', THA: 'TH', TGO: 'TG',
  TTO: 'TT', TUN: 'TN', TUR: 'TR', TKM: 'TM', UGA: 'UG', UKR: 'UA',
  ARE: 'AE', GBR: 'GB', USA: 'US', URY: 'UY', UZB: 'UZ', VEN: 'VE',
  VNM: 'VN', YEM: 'YE', ZMB: 'ZM', ZWE: 'ZW',
};

let displayNames: Intl.DisplayNames | null = null;

try {
  displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
} catch {
  // Intl.DisplayNames not supported — fall back to code
}

/**
 * Convert an ISO 3166-1 alpha-3 country code to a human-readable English name.
 * Falls back to the original code if no mapping is found.
 *
 * @example isoToCountryName('GBR') → 'United Kingdom'
 */
export const isoToCountryName = (iso3: string): string => {
  if (!iso3) return iso3;
  const iso2 = iso3ToIso2[iso3.toUpperCase()];
  if (!iso2 || !displayNames) return iso3;
  try {
    return displayNames.of(iso2) ?? iso3;
  } catch {
    return iso3;
  }
};
