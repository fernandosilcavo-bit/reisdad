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

	// Collect all paths and infer codes from attributes
	const allPaths = [...svgRoot.querySelectorAll('path')];
	const codeToPathEls = new Map();
	const idRegex = /([A-Z]{2}[A-Z0-9]{1,3})/; // TR10, GRC, EL30, UKI3
	for (const path of allPaths) {
		if (path.closest('#graticule') || path.closest('#context')) continue;
		let code = (
			path.getAttribute('data-iso') ||
			path.getAttribute('data-nuts') ||
			path.getAttribute('nuts_id') ||
			path.getAttribute('NUTS_ID') ||
			''
		).trim().toUpperCase();
		if (!code) {
			const pid = (path.getAttribute('id') || '').toUpperCase();
			const m = pid.match(idRegex);
			if (m) code = m[1];
		}
		if (!code) continue;
		// Accept codes 2-5 chars starting with letters only; avoid unrelated helpers
		if (code.length < 2 || code.length > 5) continue;
		if (!/^[A-Z]{2}/.test(code)) continue;
		if (!codeToPathEls.has(code)) codeToPathEls.set(code, []);
		codeToPathEls.get(code).push(path);
	}

	const provinces = [];
	for (const [code, els] of codeToPathEls.entries()) {
		const uniqueEls = Array.from(new Set(els));
		const prov = new Province(code, code, code, uniqueEls[0], uniqueEls);
		provinces.push(prov);
	}

	// Build neighbor graph via path bounding box union
	const bboxes = new Map();
	for (const p of provinces) {
		try {
			let union = null;
			for (const el of p.pathEls) {
				const bb = el.getBBox();
				if (!union) union = { ...bb };
				else union = {
					x: Math.min(union.x, bb.x),
					y: Math.min(union.y, bb.y),
					width: Math.max(union.x + union.width, bb.x + bb.width) - Math.min(union.x, bb.x),
					height: Math.max(union.y + union.height, bb.y + bb.height) - Math.min(union.y, bb.y),
				};
			}
			bboxes.set(p.id, union || { x: 0, y: 0, width: 0, height: 0 });
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
		for (const el of p.pathEls) {
			el.style.cursor = 'pointer';
			el.addEventListener('mouseenter', () => {
				for (const e of p.pathEls) e.classList.add('province-hover');
				handlers.onHover && handlers.onHover(p);
			});
			el.addEventListener('mouseleave', () => {
				for (const e of p.pathEls) e.classList.remove('province-hover');
				handlers.onUnhover && handlers.onUnhover(p);
			});
			el.addEventListener('click', (ev) => {
				ev.stopPropagation();
				handlers.onClick && handlers.onClick(p);
			});
		}
	}
}