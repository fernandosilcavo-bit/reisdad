import { Province } from './gameState.js';

export async function loadSvgAndExtractProvinces(objectEl) {
	await new Promise((resolve, reject) => {
		if (objectEl.contentDocument) return resolve();
		objectEl.addEventListener('load', resolve, { once: true });
		objectEl.addEventListener('error', reject, { once: true });
	});

	let svgDoc = objectEl.contentDocument || null;
	let svgRoot = svgDoc && svgDoc.querySelector && svgDoc.querySelector('svg');

	// Fallback: fetch and inline the SVG into DOM if object embedding fails
	if (!svgRoot) {
		const dataUrl = objectEl.getAttribute('data') || 'map.svg';
		const inline = await inlineSvgIntoPage(dataUrl, objectEl.parentElement || document.body);
		svgRoot = inline;
		svgDoc = svgRoot.ownerDocument;
		// Hide the object to avoid duplicate visuals
		objectEl.style.display = 'none';
	}

	if (!svgRoot) throw new Error('SVG kökü bulunamadı');

	injectInteractionStyles(svgDoc, svgRoot);

	// Provinces: prefer #countries group; else filter by paths having data-iso
	const provinces = [];
	const countryGroup = svgRoot.querySelector('#countries');
	let pathList = [];
	if (countryGroup) {
		pathList = [...countryGroup.querySelectorAll('path')];
	} else {
		pathList = [...svgRoot.querySelectorAll('path[data-iso]')];
	}

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
	const inflate = 1.5;
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

async function inlineSvgIntoPage(url, mount) {
	const res = await fetch(url, { cache: 'no-cache' });
	const text = await res.text();
	const parser = new DOMParser();
	const doc = parser.parseFromString(text, 'image/svg+xml');
	let svg = doc.documentElement;
	if (!svg || svg.nodeName.toLowerCase() !== 'svg') return null;
	// Import into current document
	svg = document.importNode(svg, true);
	svg.setAttribute('id', 'inline-svg-root');
	mount.appendChild(svg);
	return svg;
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