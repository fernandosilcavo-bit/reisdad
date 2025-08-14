import { formatNumber } from './utils.js';
import { lookupCountryName, lookupRegionName } from './names.js';

export function bindUI() {
	return {
		turnInfo: document.getElementById('turn-info'),
		playerInfo: document.getElementById('player-info'),
		endTurnBtn: document.getElementById('end-turn-btn'),
		saveBtn: document.getElementById('save-btn'),
		loadBtn: document.getElementById('load-btn'),
		overlay: document.getElementById('overlay'),
		countrySelect: document.getElementById('country-select'),
		startGameBtn: document.getElementById('start-game'),
		cancelSelectBtn: document.getElementById('cancel-select'),
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
	const playerName = player ? lookupCountryName(player.id) : '';
	ui.playerInfo.textContent = player ? `${playerName} • Altın: ${formatNumber(player.gold)}` : 'Seçim bekleniyor…';
	ui.endTurnBtn.disabled = !player;
	ui.saveBtn.disabled = !player;
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
		ui.diploView.innerHTML = '—';
		return;
	}
	const owner = province.ownerId ? state.countryIdToCountry.get(province.ownerId) : null;
	const regionName = lookupRegionName(province.id, province.isoCode);
	ui.selectedProvince.textContent = regionName;
	const ownerName = owner ? lookupCountryName(owner.id) : 'Bağımsız';
	ui.selectedOwner.innerHTML = owner ? `${ownerName} <span class="badge">${owner.gold} altın</span>` : ownerName;
	ui.selectedStats.textContent = `Ordu: ${formatNumber(province.army)} • Ekonomi: ${formatNumber(province.economy)}`;

	const isPlayer = owner && owner.id === state.playerCountryId;
	ui.recruitBtn.disabled = !isPlayer;
	ui.improveEconBtn.disabled = !isPlayer;
	ui.moveModeBtn.disabled = !isPlayer || province.army <= 0;
	ui.declareWarBtn.disabled = !isPlayer;

	updateDiplomacy(ui, state);
}

export function updateDiplomacy(ui, state) {
	const player = state.playerCountryId && state.countryIdToCountry.get(state.playerCountryId);
	if (!player) { ui.diploView.innerHTML = '—'; return; }
	const neighborIds = [];
	ui.diploView.dataset.needsPopulate = '1';
}

export function flashMessage(text) {
	console.log('[INFO]', text);
}