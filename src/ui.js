import { formatNumber } from './utils.js';

export function bindUI() {
	return {
		turnInfo: document.getElementById('turn-info'),
		playerInfo: document.getElementById('player-info'),
		endTurnBtn: document.getElementById('end-turn-btn'),
		overlay: document.getElementById('overlay'),
		autoPickBtn: document.getElementById('auto-pick'),
		selectedProvince: document.getElementById('selected-province'),
		selectedOwner: document.getElementById('selected-owner'),
		selectedStats: document.getElementById('selected-stats'),
		recruitBtn: document.getElementById('recruit-btn'),
		improveEconBtn: document.getElementById('improve-econ-btn'),
		moveModeBtn: document.getElementById('move-mode-btn'),
		declareWarBtn: document.getElementById('declare-war-btn'),
		diploView: document.getElementById('diplomacy-view'),
		objectEl: document.getElementById('svgMap'),
	};
}

export function updateTopbar(ui, state) {
	ui.turnInfo.textContent = `Tur: ${state.turn} • Yıl: ${state.year}`;
	const player = state.playerCountryId ? state.countryIdToCountry.get(state.playerCountryId) : null;
	ui.playerInfo.textContent = player ? `${player.name} • Altın: ${formatNumber(player.gold)}` : 'Seçim bekleniyor…';
	ui.endTurnBtn.disabled = !player;
}

export function showSelection(ui, state, province) {
	if (!province) {
		ui.selectedProvince.textContent = '—';
		ui.selectedOwner.textContent = '—';
		ui.selectedStats.textContent = '—';
		ui.recruitBtn.disabled = true;
		ui.improveEconBtn.disabled = true;
		ui.moveModeBtn.disabled = true;
		ui.declareWarBtn.disabled = true;
		return;
	}
	const owner = province.ownerId ? state.countryIdToCountry.get(province.ownerId) : null;
	ui.selectedProvince.textContent = province.name;
	ui.selectedOwner.innerHTML = owner ? `${owner.name} <span class="badge">${owner.gold} altın</span>` : 'Bağımsız';
	ui.selectedStats.textContent = `Ordu: ${formatNumber(province.army)} • Ekonomi: ${formatNumber(province.economy)}`;

	const isPlayer = owner && owner.id === state.playerCountryId;
	ui.recruitBtn.disabled = !isPlayer;
	ui.improveEconBtn.disabled = !isPlayer;
	ui.moveModeBtn.disabled = !isPlayer || province.army <= 0;
	ui.declareWarBtn.disabled = !isPlayer;
}

export function flashMessage(text) {
	console.log('[INFO]', text);
}