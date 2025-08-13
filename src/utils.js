export function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

export function randomItem(list) {
	return list[Math.floor(Math.random() * list.length)];
}

export function generateColor(seedIndex) {
	const hue = (seedIndex * 47) % 360;
	return `hsl(${hue} 65% 60%)`;
}

export function lightenColor(hsl, amount = 10) {
	// expects hsl like hsl(h s% l%)
	try {
		const [h, s, l] = hsl.match(/\d+/g).map(Number);
		return `hsl(${h} ${s}% ${clamp(l + amount, 20, 95)}%)`;
	} catch (e) {
		return hsl;
	}
}

export function formatNumber(n) {
	return new Intl.NumberFormat('tr-TR').format(Math.round(n));
}

export function waitForEvent(target, eventName) {
	return new Promise(resolve => target.addEventListener(eventName, resolve, { once: true }));
}

export function sleep(ms) {
	return new Promise(r => setTimeout(r, ms));
}