export class Province {
	constructor(id, isoCode, name, pathEl) {
		this.id = id;
		this.isoCode = isoCode || null; // country code from data-iso if present
		this.name = name || isoCode || id;
		this.pathEl = pathEl; // SVGPathElement
		this.ownerId = null;
		this.army = 0;
		this.economy = 1; // produces gold per turn baseline
		this.neighbors = new Set(); // province ids
	}
}

export class Country {
	constructor(id, name, color) {
		this.id = id;
		this.name = name;
		this.color = color;
		this.gold = 50;
		this.tech = 1;
		this.provinces = new Set();
		this.atWarWith = new Set();
	}
}

export class GameState {
	constructor() {
		this.turn = 1;
		this.year = 1444;
		this.isPlayerPicked = false;
		this.playerCountryId = null;

		this.provinceIdToProvince = new Map();
		this.countryIdToCountry = new Map();
		this.isoToProvinceIds = new Map(); // ISO code -> Set of province ids
	}

	addProvince(prov) {
		this.provinceIdToProvince.set(prov.id, prov);
		if (prov.isoCode) {
			if (!this.isoToProvinceIds.has(prov.isoCode)) this.isoToProvinceIds.set(prov.isoCode, new Set());
			this.isoToProvinceIds.get(prov.isoCode).add(prov.id);
		}
	}

	addCountry(country) {
		this.countryIdToCountry.set(country.id, country);
	}

	setOwner(provinceId, countryId) {
		const province = this.provinceIdToProvince.get(provinceId);
		const country = this.countryIdToCountry.get(countryId);
		if (!province || !country) return;
		if (province.ownerId) {
			const prev = this.countryIdToCountry.get(province.ownerId);
			if (prev) prev.provinces.delete(provinceId);
		}
		province.ownerId = countryId;
		country.provinces.add(provinceId);
		if (province.pathEl) province.pathEl.style.fill = country.color;
	}

	collectIncome() {
		for (const country of this.countryIdToCountry.values()) {
			let income = 0;
			for (const pid of country.provinces) {
				const prov = this.provinceIdToProvince.get(pid);
				income += prov.economy;
			}
			country.gold += Math.round(income);
		}
	}

	advanceTurn() {
		this.turn += 1;
		this.year += 1; // simple progression
		this.collectIncome();
	}
}