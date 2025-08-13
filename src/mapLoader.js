import { Province } from './gameState.js';

export async function loadSvgAndExtractProvinces(objectEl) {
	await new Promise((resolve, reject) => {
		if (objectEl.contentDocument) return resolve();
		objectEl.addEventListener('load', resolve, { once: true });
		objectEl.addEventListener('error', reject, { once: true });
	});

	const svgDoc = objectEl.contentDocument;
	const svgRoot = svgDoc && svgDoc.querySelector('svg');
	if (!svgRoot) throw new Error('SVG kökü bulunamadı');

	injectInteractionStyles(svgDoc, svgRoot);

	// Provinces: use countries group if present, else all paths
	const provinces = [];
	const countryGroup = svgRoot.querySelector('#countries');
	const pathList = countryGroup ? [...countryGroup.querySelectorAll('path')] : [...svgRoot.querySelectorAll('path')];

	let counter = 0;
	for (const path of pathList) {
		const iso = path.getAttribute('data-iso') || null;
		const id = path.id || `prov-${iso || 'p'}-${counter++}`;
		const provName = iso ?? id;
		const prov = new Province(id, iso, provName, path);
		provinces.push(prov);
	}

	// Build neighbor graph via path bounding box proximity (cheap heuristic)
	const bboxes = new Map();
	for (const p of provinces) {
		try {
			bboxes.set(p.id, p.pathEl.getBBox());
		} catch {
			bboxes.set(p.id, { x: 0, y: 0, width: 0, height: 0 });
		}
	}
	const inflate = 2;
	for (let i = 0; i < provinces.length; i++) {
		for (let j = i + 1; j < provinces.length; j++) {
			const a = bboxes.get(provinces[i].id);
			const b = bboxes.get(provinces[j].id);
			const overlap = !(a.x + a.width + inflate < b.x || b.x + b.width + inflate < a.x || a.y + a.height + inflate < b.y || b.y + b.height + inflate < a.y);
			if (overlap) {
				provinces[i].neighbors.add(provinces[j].id);
				provinces[j].neighbors.add(provinces[i].id);
			}
		}
	}

	return { svgDoc, svgRoot, provinces };
}

function injectInteractionStyles(svgDoc, svgRoot) {
	const styleEl = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'style');
	styleEl.setAttribute('type', 'text/css');
	styleEl.textContent = `.province-hover{filter:brightness(1.15) saturate(1.1);} .province-selected{stroke:#111;stroke-width:1.6;}`;
	const defs = svgRoot.querySelector('defs');
	if (defs) defs.appendChild(styleEl); else svgRoot.insertBefore(styleEl, svgRoot.firstChild);
}

export function wireProvinceInteractions(provinces, handlers) {
	for (const p of provinces) {
		p.pathEl.style.cursor = 'pointer';
		p.pathEl.addEventListener('mouseenter', () => {
			p.pathEl.classList.add('province-hover');
			handlers.onHover && handlers.onHover(p);
		});
		p.pathEl.addEventListener('mouseleave', () => {
			p.pathEl.classList.remove('province-hover');
			handlers.onUnhover && handlers.onUnhover(p);
		});
		p.pathEl.addEventListener('click', (ev) => {
			ev.stopPropagation();
			handlers.onClick && handlers.onClick(p);
		});
	}
}