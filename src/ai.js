export function aiTakeTurn(state) {
	for (const country of state.countryIdToCountry.values()) {
		if (country.id === state.playerCountryId) continue;
		// Recruit in richest province if gold allows
		const provinces = [...country.provinces].map(id => state.provinceIdToProvince.get(id));
		provinces.sort((a,b)=>b.economy - a.economy);
		const baseCost = 5;
		for (const p of provinces) {
			const cost = Math.max(baseCost, Math.round(baseCost * (1 + p.army * 0.1)));
			if (country.gold >= cost) { country.gold -= cost; p.army += 1; break; }
		}
		// Try to attack a weaker neighbor
		for (const p of provinces) {
			if (p.army <= 0) continue;
			let target = null;
			for (const nid of p.neighbors) {
				const np = state.provinceIdToProvince.get(nid);
				if (!np.ownerId || np.ownerId === country.id) continue;
				const enemy = state.countryIdToCountry.get(np.ownerId);
				const atWar = enemy && (country.atWarWith.has(enemy.id) || enemy.atWarWith.has(country.id));
				if (!atWar) continue;
				if (!target || np.army < target.army) target = np;
			}
			if (target) {
				// resolve as moveArmy would do
				const attack = p.army;
				const defend = target.army;
				const attackPower = attack * (1 + 0.05 * country.tech);
				const defendPower = defend * (1 + 0.05 * (state.countryIdToCountry.get(target.ownerId)?.tech || 1));
				if (attackPower > defendPower) {
					const survivors = Math.max(0, Math.round(attack * 0.4));
					p.army = 0;
					target.army = survivors;
					state.setOwner(target.id, country.id);
				} else {
					const survivors = Math.max(0, Math.round(defend * 0.6));
					p.army = 0;
					target.army = survivors;
				}
				break;
			}
		}
	}
}