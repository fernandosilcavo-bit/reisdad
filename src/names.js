const ISO3_NAMES = {
	ALB: 'Albania', AND: 'Andorra', ARM: 'Armenia', AUT: 'Austria', AZE: 'Azerbaijan',
	BEL: 'Belgium', BGR: 'Bulgaria', BIH: 'Bosnia and Herzegovina', BLR: 'Belarus', CHE: 'Switzerland',
	CYP: 'Cyprus', CZE: 'Czechia', DEU: 'Germany', DNK: 'Denmark', DZA: 'Algeria',
	ESP: 'Spain', EST: 'Estonia', FIN: 'Finland', FRA: 'France', GBR: 'United Kingdom',
	GEO: 'Georgia', GRC: 'Greece', HRV: 'Croatia', HUN: 'Hungary', IRL: 'Ireland',
	ISL: 'Iceland', ITA: 'Italy', KAZ: 'Kazakhstan', LTU: 'Lithuania', LUX: 'Luxembourg',
	LVA: 'Latvia', MAR: 'Morocco', MDA: 'Moldova', MKD: 'North Macedonia', MNE: 'Montenegro',
	NLD: 'Netherlands', NOR: 'Norway', POL: 'Poland', PRT: 'Portugal', ROU: 'Romania',
	RUS: 'Russia', SRB: 'Serbia', SVK: 'Slovakia', SVN: 'Slovenia', SWE: 'Sweden',
	TUR: 'Turkey', UKR: 'Ukraine'
};

const ISO2_NAMES = {
	AL: 'Albania', AD: 'Andorra', AM: 'Armenia', AT: 'Austria', AZ: 'Azerbaijan',
	BE: 'Belgium', BG: 'Bulgaria', BA: 'Bosnia and Herzegovina', BY: 'Belarus', CH: 'Switzerland',
	CY: 'Cyprus', CZ: 'Czechia', DE: 'Germany', DK: 'Denmark', DZ: 'Algeria',
	ES: 'Spain', EE: 'Estonia', FI: 'Finland', FR: 'France', GB: 'United Kingdom',
	GE: 'Georgia', GR: 'Greece', HR: 'Croatia', HU: 'Hungary', IE: 'Ireland',
	IS: 'Iceland', IT: 'Italy', KZ: 'Kazakhstan', LT: 'Lithuania', LU: 'Luxembourg',
	LV: 'Latvia', MA: 'Morocco', MD: 'Moldova', MK: 'North Macedonia', ME: 'Montenegro',
	NL: 'Netherlands', NO: 'Norway', PL: 'Poland', PT: 'Portugal', RO: 'Romania',
	RU: 'Russia', RS: 'Serbia', SK: 'Slovakia', SI: 'Slovenia', SE: 'Sweden',
	TR: 'Turkey', UA: 'Ukraine'
};

// Specific regional overrides (examples). Extend as needed based on SVG codes
const REGION_OVERRIDES = {
	DE30: 'Berlin',
	TR10: 'İstanbul',
	EL30: 'Attiki (Athens)',
	UKI3: 'Inner London - West',
	UKI4: 'Inner London - East'
};

export function lookupCountryName(code) {
	if (!code) return '';
	const up = code.toUpperCase();
	if (up.length === 3) return ISO3_NAMES[up] || up;
	if (up.length === 2) return ISO2_NAMES[up] || up;
	return up;
}

export function lookupRegionName(regionCode, isoRoot) {
	if (!regionCode) return '';
	const up = regionCode.toUpperCase();
	if (REGION_OVERRIDES[up]) return REGION_OVERRIDES[up];
	// Fallbacks: if regionCode equals country code, show country name
	if (up.length === 3 && /^[A-Z]{3}$/.test(up)) return lookupCountryName(up);
	// Else show region code as is
	return up;
}