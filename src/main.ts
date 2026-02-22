import './style.css'

// ========== Core Player Logic ==========
let cues: any[] = [];
let currentIdx = -1;
let isSwapped = false;
let isSeeking = false;

const vP = document.getElementById('vPPT') as HTMLVideoElement;
const vT = document.getElementById('vTeacher') as HTMLVideoElement;
const prog = document.getElementById('prog') as HTMLInputElement;
const oEn = document.getElementById('oEn') as HTMLDivElement;
const oZh = document.getElementById('oZh') as HTMLDivElement;
const list = document.getElementById('subList') as HTMLDivElement;

let userPauseScrollTimeout: number | undefined;
let isUserScrolling = false;

function handleManualScroll() {
    isUserScrolling = true;
    if (userPauseScrollTimeout) clearTimeout(userPauseScrollTimeout);
    userPauseScrollTimeout = window.setTimeout(() => {
        isUserScrolling = false;
        // Snap back to active when user stops interacting for 3s, only if video is playing
        if (currentIdx !== -1 && !vP.paused) {
            const activeEl = document.getElementById(`cue-${currentIdx}`);
            if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 3000);
}

list.addEventListener('wheel', handleManualScroll, { passive: true });
list.addEventListener('touchmove', handleManualScroll, { passive: true });
list.addEventListener('mousedown', handleManualScroll);
list.addEventListener('touchstart', handleManualScroll, { passive: true });

function formatT(s: number) {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
}

function parseVTT(text: string) {
    const clean = (l: string) => l.replace(/<[^>]*>/g, '').trim();
    const results = [];
    const lines = text.split('\n').map(l => l.trim());
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('-->')) {
            const times = lines[i].split('-->').map(t => {
                const p = t.trim().split(':'); if (!p[2]) return 0;
                return parseInt(p[0]) * 3600 + parseInt(p[1]) * 60 + parseFloat(p[2]);
            });
            let en = '', zh = ''; i++;
            while (i < lines.length && lines[i] !== '') {
                const c = clean(lines[i]);
                if (/[\u4e00-\u9fff]/.test(c)) zh = c; else en = en ? en + ' ' + c : c;
                i++;
            }
            if (en || zh) results.push({ s: times[0], e: times[1], en, zh });
        }
    }
    return results;
}

function renderSubs(items: any[]) {
    const searchVal = (document.getElementById('searchBox') as HTMLInputElement).value.toLowerCase().trim();
    if (items.length === 0) { list.innerHTML = '<div style="padding:20px; text-align:center; color:#555;">No matches</div>'; return; }
    const html = items.map((c, i) => {
        const origIdx = cues.indexOf(c);
        let en = c.en, zh = c.zh;
        if (searchVal) {
            const reg = new RegExp(`(${searchVal})`, 'gi');
            en = en.replace(reg, '<span class="highlight">$1</span>');
            zh = zh.replace(reg, '<span class="highlight">$1</span>');
        }
        return `<div class="sub-item" data-i="${origIdx}" id="cue-${origIdx}">
            <div class="time">${formatT(c.s)}</div>
            <div class="en">${en}</div>
            <div class="zh">${zh}</div>
        </div>`;
    }).join('');
    list.innerHTML = html;
    document.getElementById('subCount')!.textContent = items.length.toString();

    // Add click listeners
    document.querySelectorAll('.sub-item').forEach(el => {
        el.addEventListener('click', (e) => {
            const idx = parseInt((e.currentTarget as HTMLDivElement).dataset.i || '0');
            const targetTime = cues[idx].s;
            vP.currentTime = vT.currentTime = targetTime;
            vP.play(); vT.play();
            document.getElementById('playBtn')!.textContent = '⏸';
            updateActive(idx, true);
        })
    });

    if (currentIdx !== -1) updateActive(currentIdx, false);
}

function updateActive(idx: number, scroll: boolean) {
    if (idx === currentIdx) return;
    currentIdx = idx;
    document.querySelectorAll('.sub-item.active').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(`cue-${idx}`);
    if (activeEl) {
        activeEl.classList.add('active');
        if (scroll && !isUserScrolling) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const c = cues[idx];
    if (c) { oEn.textContent = c.en; oZh.textContent = c.zh; }
    else { oEn.textContent = ''; oZh.textContent = ''; }
}

vP.addEventListener('timeupdate', () => {
    if (isSeeking) return;
    prog.value = ((vP.currentTime / vP.duration) * 100).toString() || "0";
    document.getElementById('timeDisp')!.textContent = `${formatT(vP.currentTime)} / ${formatT(vP.duration)}`;
    const found = cues.findIndex(c => vP.currentTime >= c.s && vP.currentTime <= c.e);
    if (found !== -1 && found !== currentIdx) {
        updateActive(found, true);
    }
    if (!isSwapped) vT.currentTime = vP.currentTime;
});

vT.addEventListener('timeupdate', () => { if (isSwapped) vP.currentTime = vT.currentTime; });

document.getElementById('playBtn')!.addEventListener('click', () => {
    if (vP.paused) { vP.play(); vT.play(); document.getElementById('playBtn')!.textContent = '⏸'; }
    else { vP.pause(); vT.pause(); document.getElementById('playBtn')!.textContent = '▶'; }
});

prog.addEventListener('input', () => { isSeeking = true; const t = (parseFloat(prog.value) / 100) * vP.duration; vP.currentTime = vT.currentTime = t; });
prog.addEventListener('change', () => isSeeking = false);

document.getElementById('swapBtn')!.addEventListener('click', () => {
    isSwapped = !isSwapped;
    const label = document.querySelector('.pip-header span')!;
    if (isSwapped) {
        vP.style.position = 'absolute'; vP.style.zIndex = '0'; vT.style.position = 'static'; vT.style.zIndex = '1'; vP.muted = true; vT.muted = false;
        label.textContent = '📊 PPT';
    } else {
        vP.style.position = 'static'; vP.style.zIndex = '1'; vT.style.position = 'absolute'; vT.style.zIndex = '0'; vP.muted = false; vT.muted = true;
        label.textContent = '🎥 TEACHER';
    }
});

document.querySelectorAll('.speed-btn').forEach(btn => btn.addEventListener('click', (e) => {
    const s = parseFloat((e.currentTarget as HTMLButtonElement).dataset.speed!);
    vP.playbackRate = vT.playbackRate = s;
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.toggle('active', b === btn));
}));

document.getElementById('searchBox')!.addEventListener('input', () => {
    const q = (document.getElementById('searchBox') as HTMLInputElement).value.toLowerCase();
    const filtered = cues.filter(c => c.en.toLowerCase().includes(q) || c.zh.includes(q));
    renderSubs(filtered);
});

// Setup
fetch('/clean_transcript_bilingual.vtt').then(r => r.text()).then(t => {
    cues = parseVTT(t);
    renderSubs(cues);
});
