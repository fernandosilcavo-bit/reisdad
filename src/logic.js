import { Country } from './gameState.js';
import { generateColor, randomItem } from './utils.js';

export function bootstrapCountriesFromIso(state) {
	const isoCodes = [...state.isoToProvinceIds.keys()].filter(Boolean).sort();
	let idx = 0;
	for (const iso of isoCodes) {
		const color = generateColor(idx++);
		const country = new Country(iso, iso, color);
		state.addCountry(country);
		for (const pid of state.isoToProvinceIds.get(iso)) {
			state.setOwner(pid, iso);
		}
	}
}

export function randomizeNeutralOwners(state) {
	const orphanProvs = [...state.provinceIdToProvince.values()].filter(p => !p.ownerId);
	if (orphanProvs.length === 0) return;
	const minorCount = Math.max(3, Math.min(12, Math.round(orphanProvs.length / 30)));
	const minorIds = Array.from({ length: minorCount }, (_, i) => `MIN${i + 1}`);
	minorIds.forEach((id, i) => state.addCountry(new Country(id, `Minör ${i + 1}`, generateColor(200 + i))));
	for (const prov of orphanProvs) {
		const m = randomItem(minorIds);
		state.setOwner(prov.id, m);
	}
}

export function recruit(state, provinceId) {
	const province = state.provinceIdToProvince.get(provinceId);
	if (!province) return { ok: false, reason: 'Bilinmeyen bölge' };
	const owner = province.ownerId && state.countryIdToCountry.get(province.ownerId);
	if (!owner) return { ok: false, reason: 'Sahip yok' };
	if (owner.id !== state.playerCountryId) return { ok: false, reason: 'Size ait değil' };
	const base = 5;
	const cost = Math.max(base, Math.round(base * (1 + province.army * 0.1))); // daha çok asker, daha pahalı
	if (owner.gold < cost) return { ok: false, reason: `Yetersiz altın (${cost})` };
	owner.gold -= cost;
	province.army += 1;
	return { ok: true };
}

export function improveEconomy(state, provinceId) {
	const province = state.provinceIdToProvince.get(provinceId);
	const owner = province?.ownerId && state.countryIdToCountry.get(province.ownerId);
	if (!owner || owner.id !== state.playerCountryId) return { ok: false };
	const cost = 8 * province.economy;
	if (owner.gold < cost) return { ok: false, reason: 'Yetersiz altın' };
	owner.gold -= cost;
	province.economy += 1;
	return { ok: true };
}

export function canDeclareWar(state, a, b) {
	if (state.hasTruce(a, b)) return { ok: false, reason: 'Ateşkes var' };
	return { ok: true };
}

export function declareWar(state, targetCountryId) {
	const player = state.countryIdToCountry.get(state.playerCountryId);
	const target = state.countryIdToCountry.get(targetCountryId);
	if (!player || !target) return { ok: false };
	const check = canDeclareWar(state, player.id, target.id);
	if (!check.ok) return check;
	player.atWarWith.add(target.id);
	target.atWarWith.add(player.id);
	state.adjustRelation(player.id, target.id, -40);
	return { ok: true };
}

export function proposeAlliance(state, targetCountryId) {
	const player = state.countryIdToCountry.get(state.playerCountryId);
	if (!player) return { ok: false };
	if (state.areAllied(player.id, targetCountryId)) return { ok: false, reason: 'Zaten müttefik' };
	const rel = state.getRelation(player.id, targetCountryId);
	if (rel < 20) return { ok: false, reason: 'İlişki yetersiz' };
	state.addAlliance(player.id, targetCountryId);
	state.adjustRelation(player.id, targetCountryId, +10);
	return { ok: true };
}

export function makePeace(state, targetCountryId) {
	const player = state.countryIdToCountry.get(state.playerCountryId);
	if (!player) return { ok: false };
	player.atWarWith.delete(targetCountryId);
	const target = state.countryIdToCountry.get(targetCountryId);
	if (target) target.atWarWith.delete(player.id);
	state.setTruce(player.id, targetCountryId, state.turn + 10);
	state.adjustRelation(player.id, targetCountryId, +10);
	return { ok: true };
}

export function neighboringCountriesOf(state, countryId) {
	const seen = new Set();
	const neighbors = new Set();
	for (const pid of state.countryIdToCountry.get(countryId)?.provinces || []) {
		const p = state.provinceIdToProvince.get(pid);
		for (const npid of p.neighbors) {
			if (seen.has(npid)) continue;
			seen.add(npid);
			const np = state.provinceIdToProvince.get(npid);
			if (np.ownerId && np.ownerId !== countryId) neighbors.add(np.ownerId);
		}
	}
	return [...neighbors].sort();
}

export function moveArmy(state, fromId, toId) {
	const from = state.provinceIdToProvince.get(fromId);
	const to = state.provinceIdToProvince.get(toId);
	if (!from || !to) return { ok: false };
	if (!from.neighbors.has(to.id)) return { ok: false, reason: 'Komşu değil' };
	const owner = from.ownerId && state.countryIdToCountry.get(from.ownerId);
	if (!owner || owner.id !== state.playerCountryId) return { ok: false };
	if (from.army <= 0) return { ok: false };
	// Allied territory: allow transit and merge army
	if (to.ownerId === from.ownerId || state.areAllied(owner.id, to.ownerId)) {
		to.army += from.army;
		from.army = 0;
		return { ok: true };
	}
	// Enemy?
	const targetOwner = to.ownerId && state.countryIdToCountry.get(to.ownerId);
	const atWar = targetOwner && (owner.atWarWith.has(targetOwner.id) || targetOwner.atWarWith.has(owner.id));
	if (!atWar) return { ok: false, reason: 'Savaş yok' };
	const attack = from.army;
	const defend = to.army;
	const attackPower = attack * (1 + 0.05 * owner.tech);
	const defendPower = defend * (1 + 0.05 * (targetOwner?.tech || 1));
	if (attackPower > defendPower) {
		const survivors = Math.max(0, Math.round(attack * 0.4));
		from.army = 0;
		to.army = survivors;
		state.setOwner(to.id, owner.id);
		return { ok: true, captured: true };
	} else {
		const survivors = Math.max(0, Math.round(defend * 0.6));
		from.army = 0;
		to.army = survivors;
		return { ok: true, captured: false };
	}
}