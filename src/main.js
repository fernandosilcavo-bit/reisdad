import { GameState } from './gameState.js';
import { loadSvgAndExtractProvinces, wireProvinceInteractions } from './mapLoader.js';
import { bindUI, updateTopbar, showSelection, flashMessage } from './ui.js';
import { bootstrapCountriesFromIso, randomizeNeutralOwners, recruit, improveEconomy, declareWar, moveArmy, neighboringCountriesOf, proposeAlliance, makePeace, canDeclareWar } from './logic.js';
import { randomItem } from './utils.js';
import { saveGame, loadGame, hasSave } from './storage.js';
import { aiTakeTurn } from './ai.js';

const ui = bindUI();
const state = new GameState();
let currentSelected = null;
let moveMode = false;
let highlightedNeighbors = new Set();
let svgRootRef = null;
let labelsLayer = null;

async function init() {
	const { svgDoc, svgRoot, provinces } = await loadSvgAndExtractProvinces(ui.objectEl);
	for (const p of provinces) state.addProvince(p);
	svgRootRef = svgRoot;
	ensureLabelsLayer();

	bootstrapCountriesFromIso(state);
	randomizeNeutralOwners(state);

	wireProvinceInteractions(provinces, {
		onHover: () => {},
		onUnhover: () => {},
		onClick: (prov) => onProvinceClick(prov),
	});

	refreshCountrySelect();
	renderArmyLabels();

	svgDoc.addEventListener('click', () => {
		if (moveMode) {
			disableMoveMode();
		}
	});

	ui.endTurnBtn.addEventListener('click', () => {
		state.advanceTurn();
		aiTakeTurn(state);
		renderArmyLabels();
		saveGame(state);
		updateTopbar(ui, state);
		populateDiplomacy();
	});

	ui.autoPickBtn.addEventListener('click', () => {
		const ids = [...state.countryIdToCountry.keys()];
		ui.countrySelect.value = randomItem(ids);
	});

	ui.startGameBtn.addEventListener('click', () => {
		const picked = ui.countrySelect.value;
		if (!picked) return;
		pickPlayer(picked);
	});

	ui.cancelSelectBtn.addEventListener('click', () => {
		ui.countrySelect.value = '';
	});

	ui.saveBtn.addEventListener('click', () => {
		if (saveGame(state)) flashMessage('Oyun kaydedildi');
	});

	ui.loadBtn.addEventListener('click', () => {
		if (loadGame(state)) {
			updateTopbar(ui, state);
			renderArmyLabels();
			if (currentSelected) showSelection(ui, state, currentSelected);
			populateDiplomacy();
			flashMessage('Kayıt yüklendi');
		}
	});

	ui.recruitBtn.addEventListener('click', () => {
		if (!currentSelected) return;
		const res = recruit(state, currentSelected.id);
		if (!res.ok) return flashMessage(res.reason || 'İşlem başarısız');
		showSelection(ui, state, currentSelected);
		renderArmyLabels();
		updateTopbar(ui, state);
		saveGame(state);
	});

	ui.improveEconBtn.addEventListener('click', () => {
		if (!currentSelected) return;
		const res = improveEconomy(state, currentSelected.id);
		if (!res.ok) return flashMessage(res.reason || 'İşlem başarısız');
		showSelection(ui, state, currentSelected);
		updateTopbar(ui, state);
		saveGame(state);
	});

	ui.moveModeBtn.addEventListener('click', () => {
		if (!currentSelected) return;
		moveMode = !moveMode;
		ui.moveModeBtn.textContent = moveMode ? 'Hedefe Tıkla' : 'Ordu Taşı';
		if (moveMode) highlightNeighbors(currentSelected); else clearNeighborHighlights();
	});

	ui.declareWarBtn.addEventListener('click', () => {
		if (!currentSelected || !currentSelected.ownerId) return;
		const ownerId = currentSelected.ownerId;
		if (ownerId === state.playerCountryId) return;
		const check = canDeclareWar(state, state.playerCountryId, ownerId);
		if (!check.ok) return flashMessage(check.reason);
		const res = declareWar(state, ownerId);
		if (!res.ok) return;
		flashMessage('Savaş ilan edildi');
		populateDiplomacy();
		saveGame(state);
	});

	if (hasSave()) {
		ui.loadBtn.classList.remove('hidden');
	}

	updateTopbar(ui, state);
	populateDiplomacy();
}

function ensureLabelsLayer() {
	if (!svgRootRef) return;
	labelsLayer = svgRootRef.querySelector('#army-labels');
	if (!labelsLayer) {
		labelsLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		labelsLayer.setAttribute('id', 'army-labels');
		labelsLayer.setAttribute('pointer-events', 'none');
		svgRootRef.appendChild(labelsLayer);
	}
}

function provinceCenter(prov) {
	let union = null;
	for (const el of prov.pathEls) {
		let bb;
		try { bb = el.getBBox(); } catch { continue; }
		if (!union) union = { ...bb };
		else union = {
			x: Math.min(union.x, bb.x), y: Math.min(union.y, bb.y),
			width: Math.max(union.x + union.width, bb.x + bb.width) - Math.min(union.x, bb.x),
			height: Math.max(union.y + union.height, bb.y + bb.height) - Math.min(union.y, bb.y),
		};
	}
	if (!union) return { x: 0, y: 0 };
	return { x: union.x + union.width / 2, y: union.y + union.height / 2 };
}

function renderArmyLabels() {
	if (!labelsLayer) ensureLabelsLayer();
	if (!labelsLayer) return;
	const existing = new Set();
	for (const prov of state.provinceIdToProvince.values()) {
		const id = `label-${prov.id}`;
		existing.add(id);
		let t = labelsLayer.querySelector(`#${CSS.escape(id)}`);
		const owner = prov.ownerId && state.countryIdToCountry.get(prov.ownerId);
		if (!prov.army) {
			if (t) t.remove();
			continue;
		}
		const c = provinceCenter(prov);
		if (!t) {
			t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			t.setAttribute('id', id);
			t.setAttribute('text-anchor', 'middle');
			t.setAttribute('dominant-baseline', 'middle');
			t.setAttribute('style', 'font: 700 11px sans-serif; pointer-events:none; stroke:#000; stroke-width:2; paint-order: stroke fill;');
			labelsLayer.appendChild(t);
		}
		t.setAttribute('x', String(c.x));
		t.setAttribute('y', String(c.y));
		t.setAttribute('fill', owner ? owner.color : '#333');
		t.textContent = String(prov.army);
	}
}

function disableMoveMode() {
	moveMode = false;
	ui.moveModeBtn.textContent = 'Ordu Taşı';
	clearNeighborHighlights();
}

function highlightNeighbors(prov) {
	clearNeighborHighlights();
	for (const nid of prov.neighbors) {
		const p = state.provinceIdToProvince.get(nid);
		for (const el of p.pathEls) el.classList.add('province-moveable');
		highlightedNeighbors.add(nid);
	}
}

function clearNeighborHighlights() {
	for (const nid of highlightedNeighbors) {
		const p = state.provinceIdToProvince.get(nid);
		for (const el of p.pathEls) el.classList.remove('province-moveable');
	}
	highlightedNeighbors.clear();
}

function populateDiplomacy() {
	const player = state.playerCountryId && state.countryIdToCountry.get(state.playerCountryId);
	if (!player) return;
	const neighborIds = neighboringCountriesOf(state, player.id);
	if (!neighborIds.length) { ui.diploView.innerHTML = '<div class="info">Komşu ülke yok</div>'; return; }
	const container = document.createElement('div');
	for (const id of neighborIds) {
		const c = state.countryIdToCountry.get(id);
		if (!c) continue;
		const row = document.createElement('div');
		row.style.display = 'grid';
		row.style.gridTemplateColumns = '1fr auto auto auto';
		row.style.gap = '6px';
		const rel = state.getRelation(state.playerCountryId, c.id);
		row.innerHTML = `<div>${c.name} (${c.id})</div><div class="badge">İlişki: ${rel}</div>`;
		const allyBtn = document.createElement('button'); allyBtn.textContent = state.areAllied(state.playerCountryId, c.id) ? 'Müttefik' : 'İttifak'; allyBtn.disabled = state.areAllied(state.playerCountryId, c.id);
		const warBtn = document.createElement('button'); warBtn.textContent = 'Savaş'; warBtn.disabled = state.hasTruce(state.playerCountryId, c.id);
		const peaceBtn = document.createElement('button'); peaceBtn.textContent = 'Barış'; peaceBtn.disabled = !(player.atWarWith.has(c.id));
		row.appendChild(allyBtn);
		row.appendChild(warBtn);
		row.appendChild(peaceBtn);
		allyBtn.addEventListener('click', () => {
			const res = proposeAlliance(state, c.id);
			if (!res.ok) return flashMessage(res.reason || 'Reddedildi');
			populateDiplomacy();
			saveGame(state);
		});
		warBtn.addEventListener('click', () => {
			const check = canDeclareWar(state, state.playerCountryId, c.id);
			if (!check.ok) return flashMessage(check.reason);
			const res = declareWar(state, c.id);
			if (!res.ok) return;
			flashMessage('Savaş ilan edildi');
			populateDiplomacy();
			saveGame(state);
		});
		peaceBtn.addEventListener('click', () => {
			const res = makePeace(state, c.id);
			if (!res.ok) return;
			flashMessage('Barış yapıldı');
			populateDiplomacy();
			saveGame(state);
		});
		container.appendChild(row);
	}
	ui.diploView.innerHTML = '';
	ui.diploView.appendChild(container);
}

function refreshCountrySelect() {
	const frag = document.createDocumentFragment();
	const placeholder = document.createElement('option');
	placeholder.value = '';
	placeholder.textContent = 'Bir ülke seçin…';
	frag.appendChild(placeholder);
	for (const country of [...state.countryIdToCountry.values()].sort((a,b)=>a.name.localeCompare(b.name))) {
		const opt = document.createElement('option');
		opt.value = country.id;
		opt.textContent = `${country.name} (${country.id})`;
		frag.appendChild(opt);
	}
	ui.countrySelect.innerHTML = '';
	ui.countrySelect.appendChild(frag);
}

function pickPlayer(countryId) {
	state.playerCountryId = countryId;
	state.isPlayerPicked = true;
	ui.overlay.classList.add('hidden');
	updateTopbar(ui, state);
	saveGame(state);
	populateDiplomacy();
}

function applySelectionClass(prov, add) {
	const method = add ? 'add' : 'remove';
	for (const el of prov.pathEls) el.classList[method]('province-selected');
}

function onProvinceClick(prov) {
	if (!state.isPlayerPicked) {
		if (prov.ownerId) ui.countrySelect.value = prov.ownerId;
		currentSelected = prov;
		showSelection(ui, state, prov);
		return;
	}

	if (moveMode && currentSelected && currentSelected.id !== prov.id) {
		const res = moveArmy(state, currentSelected.id, prov.id);
		if (!res.ok) flashMessage(res.reason || 'Taşıma başarısız');
		disableMoveMode();
		showSelection(ui, state, prov);
		applySelectionClass(currentSelected, false);
		currentSelected = prov;
		applySelectionClass(currentSelected, true);
		updateTopbar(ui, state);
		aiTakeTurn(state);
		renderArmyLabels();
		saveGame(state);
		return;
	}

	if (currentSelected) applySelectionClass(currentSelected, false);
	currentSelected = prov;
	applySelectionClass(currentSelected, true);
	showSelection(ui, state, prov);
	if (moveMode) highlightNeighbors(currentSelected);
}

init().catch(err => {
	console.error(err);
	alert('Başlatma hatası: ' + err.message);
});