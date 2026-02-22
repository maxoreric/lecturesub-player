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
const colorPicker = document.getElementById('colorPicker') as HTMLInputElement;
const resizer = document.getElementById('resizer') as HTMLDivElement;
const videoPanel = document.querySelector('.video-panel') as HTMLDivElement;
const playlistBtn = document.getElementById('playlistBtn') as HTMLButtonElement;
const closeDrawer = document.getElementById('closeDrawer') as HTMLButtonElement;
const drawer = document.getElementById('playlistDrawer') as HTMLDivElement;
const drawerOverlay = document.getElementById('drawerOverlay') as HTMLDivElement;
const lectureList = document.getElementById('lectureList') as HTMLDivElement;
const courseTag = document.getElementById('courseTag') as HTMLSpanElement;

// ========== Feature: Playlist Drawer ==========
function toggleDrawer(open: boolean) {
    drawer.classList.toggle('open', open);
    drawerOverlay.classList.toggle('open', open);
}

playlistBtn.addEventListener('click', () => toggleDrawer(true));
closeDrawer.addEventListener('click', () => toggleDrawer(false));
drawerOverlay.addEventListener('click', () => toggleDrawer(false));

// ========== Feature: Dynamic Lecture Loading ==========
interface Lecture {
    id: string;
    title: string;
    vPPT: string;
    vTeacher: string;
    vtt: string;
}

let allLectures: Lecture[] = [];
let activeLectureId = '';

async function loadLecture(lec: Lecture) {
    activeLectureId = lec.id;
    courseTag.textContent = lec.title;
    document.title = `📺 ${lec.title}`;

    // Update video sources
    const pptSource = vP.querySelector('source')!;
    const teacherSource = vT.querySelector('source')!;

    // Check if source changed to avoid flash
    if (pptSource.getAttribute('src') !== lec.vPPT) {
        pptSource.setAttribute('src', lec.vPPT);
        teacherSource.setAttribute('src', lec.vTeacher);
        vP.load();
        vT.load();
    }

    // Reset subtitles
    list.innerHTML = '<div style="padding:20px; text-align:center; color:#555;">Loading cues...</div>';
    oEn.textContent = ''; oZh.textContent = '';
    currentIdx = -1;

    try {
        const r = await fetch(lec.vtt);
        const t = await r.text();
        cues = parseVTT(t);
        renderSubs(cues);
    } catch (err) {
        console.error("Failed to load VTT:", err);
    }

    // Update active state in drawer
    document.querySelectorAll('.lecture-item').forEach(el => {
        el.classList.toggle('active', (el as HTMLDivElement).dataset.id === lec.id);
    });

    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('lec', lec.id);
    window.history.replaceState({}, '', url.toString());
}

function renderLectureList(lecs: Lecture[]) {
    lectureList.innerHTML = lecs.map(l => `
        <div class="lecture-item ${l.id === activeLectureId ? 'active' : ''}" data-id="${l.id}">
            <div class="lec-title">${l.title}</div>
        </div>
    `).join('');

    document.querySelectorAll('.lecture-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = (el as HTMLDivElement).dataset.id;
            const lec = lecs.find(l => l.id === id);
            if (lec) {
                loadLecture(lec);
                toggleDrawer(false);
            }
        });
    });
}


// ========== Feature: Subtitle Color Picker ==========
const savedColor = localStorage.getItem('subColor') || '#ffeb3b';
colorPicker.value = savedColor;
document.documentElement.style.setProperty('--sub-active-color', savedColor);

colorPicker.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value;
    document.documentElement.style.setProperty('--sub-active-color', val);
    localStorage.setItem('subColor', val);
});

// ========== Feature: Resizable Panels ==========
let isDraggingResizer = false;
const savedWidth = localStorage.getItem('videoPanelWidth');
if (savedWidth) videoPanel.style.flex = `0 0 ${savedWidth}%`;

resizer.addEventListener('mousedown', () => {
    isDraggingResizer = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    resizer.classList.add('dragging');
});

document.addEventListener('mousemove', (e) => {
    if (!isDraggingResizer) return;
    const containerWidth = document.querySelector('.main')!.clientWidth;
    // Calculate percentage, keeping video panel between 20% and 80% width
    let newWidth = (e.clientX / containerWidth) * 100;
    if (newWidth < 20) newWidth = 20;
    if (newWidth > 80) newWidth = 80;
    videoPanel.style.flex = `0 0 ${newWidth}%`;
    localStorage.setItem('videoPanelWidth', newWidth.toString());
});

document.addEventListener('mouseup', () => {
    if (isDraggingResizer) {
        isDraggingResizer = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        resizer.classList.remove('dragging');
    }
});

// ========== Feature: Keyboard Shortcuts & Fullscreen ==========
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        vP.requestFullscreen().catch(err => console.error(err));
    } else {
        document.exitFullscreen();
    }
}

vP.addEventListener('dblclick', toggleFullscreen);

document.addEventListener('keydown', (e) => {
    // Ignore if user is typing in the search box
    if (document.activeElement === document.getElementById('searchBox')) return;

    switch (e.key.toLowerCase()) {
        case ' ': // Space to play/pause
            e.preventDefault();
            document.getElementById('playBtn')!.click();
            break;
        case 'arrowleft': // Left arrow to seek backward 5s
            e.preventDefault();
            vP.currentTime = Math.max(0, vP.currentTime - 5);
            break;
        case 'arrowright': // Right arrow to seek forward 5s
            e.preventDefault();
            vP.currentTime = Math.min(vP.duration, vP.currentTime + 5);
            break;
        case 'f': // F to toggle fullscreen
            e.preventDefault();
            toggleFullscreen();
            break;
        case 'm': // M to mute/unmute active video
            e.preventDefault();
            const activeVideo = isSwapped ? vT : vP;
            activeVideo.muted = !activeVideo.muted;
            break;
    }
});

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

// Initial speed load
const savedSpeed = localStorage.getItem('playSpeed');
if (savedSpeed) {
    vP.playbackRate = vT.playbackRate = parseFloat(savedSpeed);
    document.querySelectorAll('.speed-btn').forEach(b => {
        b.classList.toggle('active', (b as HTMLButtonElement).dataset.speed === savedSpeed);
    });
}

document.querySelectorAll('.speed-btn').forEach(btn => btn.addEventListener('click', (e) => {
    const s = parseFloat((e.currentTarget as HTMLButtonElement).dataset.speed!);
    vP.playbackRate = vT.playbackRate = s;
    localStorage.setItem('playSpeed', s.toString());
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.toggle('active', b === btn));
}));

document.getElementById('searchBox')!.addEventListener('input', () => {
    const q = (document.getElementById('searchBox') as HTMLInputElement).value.toLowerCase();
    const filtered = cues.filter(c => c.en.toLowerCase().includes(q) || c.zh.includes(q));
    renderSubs(filtered);
});

// Setup & Initialization
async function init() {
    try {
        const r = await fetch('/lectures.json');
        allLectures = await r.json();
        renderLectureList(allLectures);

        const params = new URLSearchParams(window.location.search);
        const targetId = params.get('lec');
        const initial = allLectures.find(l => l.id === targetId) || allLectures[0];

        if (initial) loadLecture(initial);
    } catch (err) {
        console.error("Failed to initialize lectures:", err);
    }
}

init();
