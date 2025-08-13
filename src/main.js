import { GameState } from './gameState.js';
import { loadSvgAndExtractProvinces, wireProvinceInteractions } from './mapLoader.js';
import { bindUI, updateTopbar, showSelection, flashMessage } from './ui.js';
import { bootstrapCountriesFromIso, randomizeNeutralOwners, recruit, improveEconomy, declareWar, moveArmy } from './logic.js';
import { randomItem } from './utils.js';

const ui = bindUI();
const state = new GameState();
let currentSelected = null;
let moveMode = false;

async function init() {
	const { svgDoc, svgRoot, provinces } = await loadSvgAndExtractProvinces(ui.objectEl);
	for (const p of provinces) state.addProvince(p);

	bootstrapCountriesFromIso(state);
	randomizeNeutralOwners(state);

	wireProvinceInteractions(provinces, {
		onHover: () => {},
		onUnhover: () => {},
		onClick: (prov) => onProvinceClick(prov),
	});

	// Global click cancels move mode
	svgDoc.addEventListener('click', () => {
		if (moveMode) {
			moveMode = false;
			ui.moveModeBtn.textContent = 'Ordu Taşı';
		}
	});

	ui.endTurnBtn.addEventListener('click', () => {
		state.advanceTurn();
		updateTopbar(ui, state);
	});

	ui.autoPickBtn.addEventListener('click', () => {
		const ids = [...state.countryIdToCountry.keys()];
		pickPlayer(randomItem(ids));
	});

	ui.recruitBtn.addEventListener('click', () => {
		if (!currentSelected) return;
		const res = recruit(state, currentSelected.id);
		if (!res.ok) return flashMessage(res.reason || 'İşlem başarısız');
		showSelection(ui, state, currentSelected);
		updateTopbar(ui, state);
	});

	ui.improveEconBtn.addEventListener('click', () => {
		if (!currentSelected) return;
		const res = improveEconomy(state, currentSelected.id);
		if (!res.ok) return flashMessage(res.reason || 'İşlem başarısız');
		showSelection(ui, state, currentSelected);
		updateTopbar(ui, state);
	});

	ui.moveModeBtn.addEventListener('click', () => {
		if (!currentSelected) return;
		moveMode = !moveMode;
		ui.moveModeBtn.textContent = moveMode ? 'Hedefe Tıkla' : 'Ordu Taşı';
	});

	ui.declareWarBtn.addEventListener('click', () => {
		if (!currentSelected || !currentSelected.ownerId) return;
		const ownerId = currentSelected.ownerId;
		if (ownerId === state.playerCountryId) return;
		const res = declareWar(state, ownerId);
		if (!res.ok) return;
		flashMessage('Savaş ilan edildi');
	});

	updateTopbar(ui, state);
}

function pickPlayer(countryId) {
	state.playerCountryId = countryId;
	state.isPlayerPicked = true;
	ui.overlay.classList.add('hidden');
	updateTopbar(ui, state);
}

function onProvinceClick(prov) {
	if (!state.isPlayerPicked) {
		const ownerId = prov.ownerId || [...state.countryIdToCountry.keys()][0];
		return pickPlayer(ownerId);
	}

	if (moveMode && currentSelected && currentSelected.id !== prov.id) {
		const res = moveArmy(state, currentSelected.id, prov.id);
		if (!res.ok) flashMessage(res.reason || 'Taşıma başarısız');
		moveMode = false;
		ui.moveModeBtn.textContent = 'Ordu Taşı';
		showSelection(ui, state, prov);
		currentSelected = prov;
		updateTopbar(ui, state);
		return;
	}

	if (currentSelected && currentSelected.pathEl) currentSelected.pathEl.classList.remove('province-selected');
	currentSelected = prov;
	prov.pathEl.classList.add('province-selected');
	showSelection(ui, state, prov);
}

init().catch(err => {
	console.error(err);
	alert('Başlatma hatası: ' + err.message);
});