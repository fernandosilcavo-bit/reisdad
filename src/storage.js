const SAVE_KEY = 'aoh2_svg_save_v1';

export function saveGame(state) {
	const data = {
		turn: state.turn,
		year: state.year,
		playerCountryId: state.playerCountryId,
		countries: [...state.countryIdToCountry.values()].map(c => ({
			id: c.id,
			name: c.name,
			color: c.color,
			gold: c.gold,
			tech: c.tech,
			atWarWith: [...c.atWarWith],
		})),
		relations: [...state.relations.entries()].map(([a, m]) => [a, [...m.entries()]]),
		alliances: [...state.alliances],
		truces: [...state.truces.entries()],
		provinces: [...state.provinceIdToProvince.values()].map(p => ({
			id: p.id,
			ownerId: p.ownerId,
			army: p.army,
			economy: p.economy,
		})),
	};
	localStorage.setItem(SAVE_KEY, JSON.stringify(data));
	return true;
}

export function hasSave() {
	return !!localStorage.getItem(SAVE_KEY);
}

export function loadGame(state) {
	const raw = localStorage.getItem(SAVE_KEY);
	if (!raw) return false;
	const data = JSON.parse(raw);

	// Rebuild countries
	state.countryIdToCountry.clear();
	for (const c of data.countries) {
		state.addCountry({
			id: c.id,
			name: c.name,
			color: c.color,
			gold: c.gold,
			tech: c.tech,
			provinces: new Set(),
			atWarWith: new Set(c.atWarWith || []),
		});
	}

	// Diplomacy
	state.relations = new Map((data.relations || []).map(([a, list]) => [a, new Map(list)]));
	state.alliances = new Set(data.alliances || []);
	state.truces = new Map(data.truces || []);

	// Clear province ownership and apply saved props
	for (const p of state.provinceIdToProvince.values()) {
		p.army = 0;
		if (p.pathEls) for (const el of p.pathEls) if (el) el.style.fill = '';
		p.ownerId = null;
	}

	for (const sp of data.provinces) {
		const p = state.provinceIdToProvince.get(sp.id);
		if (!p) continue;
		p.army = sp.army;
		p.economy = sp.economy;
		if (sp.ownerId) {
			state.setOwner(p.id, sp.ownerId);
		}
	}

	state.turn = data.turn;
	state.year = data.year;
	state.playerCountryId = data.playerCountryId || null;
	state.isPlayerPicked = !!state.playerCountryId;
	return true;
}