/**
 *
 * Stack
 *
 * @author Takuto Yanagida
 * @version 2021-10-23
 *
 */


function initialize(cs, opts = {}) {
	if (cs.length === 0) return;

	opts = Object.assign({
		styleBar      : ':ncTabBar',
		styleCurrent  : ':ncCurrent',
		styleActive   : ':ncActive',
		hashPrefix    : 'tst:',
		maxHeightRate : 0.8,
		doRemoveHeader: false,
	}, opts);
	const is = [];
	for (let i = 0; i < cs.length; i += 1) {
		const inst = create(cs[i], i + 1, opts);
		if (inst) is.push(inst);
	}
	onResize(() => is.forEach(resize), true);
	window.addEventListener('hashchange', () => is.forEach(onHashChanged) );

	setTimeout(() => {
		const id = location.hash.replace('#', '');
		if (id !== '') {
			const tar = document.getElementById(id);
			if (tar) tar.scrollIntoView({ behavior: 'smooth' });
		}
	}, 10);
}

function onHashChanged(inst) {
	let idx = getCurrentByHash(inst, location.hash);
	if (idx === null) idx = getAnchorPage(inst, location.hash);
	if (idx !== null) setTimeout(() => update(inst, idx), 10);
}


// -------------------------------------------------------------------------


function create(cont, cid, opts) {
	const inst = {
		opts,
		cont,
		ps    : null,
		bars  : [],
		curIdx: 0,
	};
	const [hs, ps] = extractHeadersAndPages(cont, cid, opts);
	if (hs.length === 0) return false;
	inst.ps = ps;

	const bar0 = createBar(hs, opts);
	const bar1 = createBar(hs, opts);
	inst.bars.push(bar0, bar1);

	cont.insertBefore(bar0.ul, cont.firstChild);
	for (const p of ps) cont.appendChild(p);
	cont.appendChild(bar1.ul);

	assignEvent(inst);

	const h = location.hash;
	let idx = getCurrentByHash(inst, h);
	if (idx === null) idx = getAnchorPage(inst, h);
	if (idx === null) idx = isAccordion(inst) ? -1 : 0;
	setTimeout(() => update(inst, idx), 10);
	return inst;
}

function getCurrentByHash(inst, hash) {
	if (hash.indexOf('#') === -1) return null;
	const re = new RegExp(hash + '$', 'g');
	const as = inst.bars[0].as;
	for (let i = 0; i < as.length; i += 1) {
		if (as[i].href.match(re)) return i;
	}
	return null;
}

function getAnchorPage(inst, hash) {
	const id = hash.replace('#', '');
	if (id !== '') {
		const tar = document.getElementById(id);
		if (tar) {
			const idx = inst.ps.findIndex(p => p.contains(tar));
			if (idx !== -1) return idx;
		}
	}
	return null;
}


// -------------------------------------------------------------------------


function extractHeadersAndPages(cont, cid, opts) {
	const fh = getFirstHeading(cont);
	if (!fh) return [];
	const tn = fh.tagName;
	const hs = [];
	const ps = [];
	let curP = null;

	for (const elm of Array.from(cont.children)) {
		if (elm.tagName === tn) {
			const id = `${opts.hashPrefix}${cid}-${hs.length + 1}`;
			hs.push({ elm, id });

			if (curP) ps.push(curP);
			curP = document.createElement('div');
			if (opts.doRemoveHeader) {
				cont.removeChild(elm);
			} else {
				curP.appendChild(elm);
			}
		} else {
			if (curP) curP.appendChild(elm);
		}
	}
	if (curP) ps.push(curP);
	return [hs, ps];
}

function createBar(hs, opts) {
	const ul = document.createElement('ul');
	ul.className = '';  // for Dummy
	setClass(ul, opts.styleBar);
	const as = [];

	for (const h of hs) {
		const a = createAnchor(h);
		const li = document.createElement('li');
		li.appendChild(a);
		ul.appendChild(li);
		as.push(a);
	}
	return { ul, as };
}


// -------------------------------------------------------------------------


function assignEvent(inst) {
	for (const bar of inst.bars) {
		bar.as.forEach((a, i) => {
			a.addEventListener('click', (e) => onClick(e, inst, i));
		});
	}
}

function onClick(e, inst, idx) {
	e.preventDefault();
	if (getComputedStyle(e.target.parentElement).pointerEvents === 'none') return;
	let url = e.target.href;
	if (inst.curIdx === idx) {
		idx = -1;
		url = url.replace(/#.*$/, '');
	}
	history.pushState({}, null, url);
	update(inst, idx);
	scrollToTab(inst);
}

function isAccordion(inst) {
	return getComputedStyle(inst.bars[0].ul).flexDirection === 'column';
}

function scrollToTab(inst) {
	if (inst.curIdx === -1) return;
	setTimeout(() => {
		const [{ ul: ul0 }, { ul: ul1 }] = inst.bars;
		const r0 = ul0.getBoundingClientRect();
		if (0 <= r0.top && r0.top <= window.innerHeight && 0 <= r0.bottom && r0.bottom <= window.innerHeight) {
			return;
		}
		const r1 = ul1.getBoundingClientRect();
		if (isAccordion(inst) || (r1.top < 0 || window.innerHeight < r1.bottom)) {
			inst.cont.scrollIntoView({ behavior: 'smooth' });
		}
	}, 10);
}

function update(inst, idx) {
	const ps = inst.ps;
	const [{ as: a0 }, { as: a1 }] = inst.bars;

	for (let i = 0; i < ps.length; i += 1) {
		setClass(a0[i].parentElement, inst.opts.styleCurrent, i === idx);
		setClass(a1[i].parentElement, inst.opts.styleCurrent, i === idx);
		setClass(ps[i], inst.opts.styleCurrent, i === idx);
	}
	inst.curIdx = idx;
}


// -------------------------------------------------------------------------


function resize(inst) {
	const cont = inst.cont;
	if (isAccordion(inst)) {
		cont.style.minHeight = '';
	} else {
		const minH = getMinHeight(inst);
		const h = (minH < window.innerHeight * inst.opts.maxHeightRate) ? `${minH}px` : '';
		cont.style.minHeight = h;

		if (inst.curIdx === -1) {
			update(inst, 0);
		}
	}
}

function getMinHeight(inst) {
	const [{ ul: ul0 }, { ul: ul1 }] = inst.bars;

	let marginBtm = parseInt(getComputedStyle(ul0).marginBottom);
	let marginTop = parseInt(getComputedStyle(ul1).marginTop);
	let height = 0;

	for (const p of inst.ps) {
		const ps = getComputedStyle(p);
		const mt = parseInt(ps.marginTop);
		const mb = parseInt(ps.marginBottom);
		const h  = p.getBoundingClientRect().height;

		marginBtm = Math.max(marginBtm, mt);
		marginTop = Math.max(marginTop, mb);
		height    = Math.max(height, h);
	}
	return ul0.offsetHeight + ul1.offsetHeight + marginBtm + marginTop + height;
}
