import './main.css';
import { FIXED_STEP, MAX_FINITE_N, PursuitSimulation } from './simulation';
import type { Configuration } from './simulation';
import { PursuitRenderer } from './renderer';
import { polygonName, savedLanguage, translations } from './i18n';
import type { Language, TranslationKey } from './i18n';
import { bindHelp } from './help';
import { bindNavigation } from './navigation';

function element<T extends HTMLElement>(id: string): T {
    const found = document.getElementById(id);
    if (!found) throw new Error(`Missing UI element: ${id}`);
    return found as T;
}
const badge = document.getElementById('badge');

const switchBtn = element<HTMLButtonElement>('switch-btn');
const mainDiv = element<HTMLDivElement>('main');
const playBtn = element<HTMLButtonElement>('play-btn');
const playIcon = element<HTMLImageElement>('play-icon');
const stopBtn = element<HTMLButtonElement>('stop-btn');
const ctrlCont = element<HTMLDivElement>('ctrl-container');
const countInput = element<HTMLInputElement>('drone-count');
const speedInput = element<HTMLInputElement>('speed');
const sizeInput = element<HTMLInputElement>('size');
const sizeMode = element<HTMLSelectElement>('size-mode');
const zoomInput = element<HTMLInputElement>('zoom');
const autoZoom = element<HTMLInputElement>('auto-zoom');
const offCenter = element<HTMLInputElement>('off-center');
const trails = element<HTMLInputElement>('trails');
const languageInput = element<HTMLSelectElement>('language');
let language: Language = savedLanguage();
const t = (key: TranslationKey) => translations[language][key];
const canvas = element<HTMLCanvasElement>('simulation-canvas');
const renderer = new PursuitRenderer(canvas);
const refreshHelp = bindHelp(() => language);
bindNavigation(canvas, renderer, () => {
    autoZoom.checked = renderer.autoZoom;
    zoomInput.value = String(Math.log10(renderer.zoom));
    element<HTMLOutputElement>('zoom-label').value = `${number(renderer.zoom * 100, 0)}%`;
});
const placeholder = document.createElement('div');
placeholder.classList.add('placeholder');
ctrlCont.appendChild(placeholder);
const stats = Object.fromEntries(['time', 'distance', 'radius', 'travelled', 'meeting', 'outcome'].map(key => [key, element<HTMLOutputElement>(`stat-${key}`)]));
const config: Configuration = { mode: 'polygon', count: 4, speed: 2, sizeMode: 'side', size: 20 };
let simulation = new PursuitSimulation(config);
let accumulator = 0;
let lastFrame: number | undefined;
let lastStats = -Infinity;
let flipped = false;
let previousState = simulation.state;

function number(value: number, digits = 2) {
    return value.toLocaleString(language, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function format(value: number, unit: 'm' | 's' | 'ms' = 'm') {
    return value === Infinity ? '∞' : `${number(value)} ${t(unit)}`;
}
function updateStats() {
    const m = simulation.metrics();
    stats.time.value = format(simulation.elapsed, 's');
    stats.distance.value = format(m.neighbor);
    stats.radius.value = format(m.radius);
    stats.travelled.value = format(m.travelled);
    stats.meeting.value = format(simulation.meetingTime, 's');
    const outcome = t(config.mode === 'circle' ? 'orbit' : simulation.radialFraction < 0.05 ? 'quasi' : 'converging');
    stats.outcome.value = simulation.state === 'COMPLETE' ? t('complete') :
        simulation.state === 'PAUSED' ? t('paused') : outcome;
    stats.outcome.title = simulation.radialFraction < 0.05 && config.mode !== 'circle' ? t('quasiHint') : outcome;
    element('state-help').dataset.help = simulation.state === 'COMPLETE' || simulation.state === 'PAUSED' ? 'state' :
        config.mode === 'circle' ? 'orbit' : simulation.radialFraction < 0.05 ? 'quasi' : 'state';
    refreshHelp();
    stats.meeting.title = t('meetingHint');
    element('physics-detail').textContent = `${t('radial')}: ${format(simulation.config.speed * simulation.radialFraction, 'ms')} · ${simulation.config.mode === 'circle' ? t('circleNote') : `${t('drones')}: ${simulation.count} · ${t('tangential')}: ${format(simulation.config.speed * Math.cos(Math.PI / simulation.count), 'ms')}`}`;
    element('accuracy').textContent = `${t('radiusError')}: ${number(m.errorPercent, 4)}% ${t('initialRadius')} · ${t('pathError')}: ${format(Math.abs(m.travelled - simulation.commandedDistance))}`;
    element('accuracy').title = `${t('radiusSpread')}: ${m.radiusSpread.toExponential(2)} ${t('m')}; ${t('neighborSpread')}: ${m.neighborSpread.toExponential(2)} ${t('m')}. ${t('pathHint')}`;
}
function updateButtons() {
    const running = simulation.state === 'RUNNING';
    const active = simulation.state !== 'INITIAL';
    playIcon.src = running ? '/icons/pause.svg' : '/icons/play.svg';
    playIcon.alt = t(running ? 'pause' : 'play');
    playBtn.setAttribute('aria-label', t(running ? 'pause' : simulation.state === 'COMPLETE' ? 'replay' : 'play'));
    stopBtn.setAttribute('aria-label', t('stop'));
    element<HTMLImageElement>('stop-icon').alt = t('stop');
    stopBtn.classList.toggle('appear', active);
    stopBtn.disabled = !active;
    placeholder.classList.toggle('expanded', active);
    updateStats();
}
function reset() {
    simulation = new PursuitSimulation(config);
    simulation.trailsEnabled = trails.checked;
    accumulator = 0;
    lastFrame = undefined;
    renderer.reset();
    updateButtons();
}
function updatePolygonLabel() {
    const label = config.mode === 'circle' ? t('circle') : polygonName(config.count, language);
    element<HTMLOutputElement>('polygon-label').value = label;
    countInput.setAttribute('aria-valuetext', label);
    sizeMode.disabled = config.mode === 'circle';
    updateSliderLabels();
}
function updateSliderLabels() {
    element<HTMLOutputElement>('speed-label').value = format(config.speed, 'ms');
    element<HTMLOutputElement>('size-label').value = format(config.size);
    element('length-label').textContent = t(config.mode === 'circle' ? 'circumference' : config.sizeMode === 'side' ? 'side' : 'perimeter');
    speedInput.setAttribute('aria-valuetext', format(config.speed, 'ms'));
    sizeInput.setAttribute('aria-valuetext', format(config.size));
}
function syncSizeSlider() {
    const multiplier = config.sizeMode === 'side' ? 1 : config.count;
    sizeInput.min = String(Math.min(0.1 * multiplier, config.size));
    sizeInput.max = String(Math.max(100 * multiplier, config.size));
    sizeInput.value = String(config.size);
    updateSliderLabels();
}
function applyLanguage() {
    document.documentElement.lang = language;
    document.title = t('title');
    languageInput.value = language;
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(node => {
        const key = node.dataset.i18n as TranslationKey;
        node.textContent = t(key);
    });
    element('simulation-canvas').setAttribute('aria-label', t('canvas'));
    element('center-view').setAttribute('aria-label', t('recenterHint'));
    element('center-view').title = t('recenterHint');
    switchBtn.setAttribute('aria-label', t('switch'));
    updateNavigationMode();
    updatePolygonLabel();
    updateButtons();
}
function updateNavigationMode() {
    const hint = element('camera-hint');
    const key = offCenter.checked ? 'navigate' : 'navigateCentered';
    hint.dataset.i18n = key;
    hint.textContent = t(key);
    canvas.classList.toggle('off-center', offCenter.checked);
    if (!offCenter.checked) canvas.classList.toggle('dragging', false);
}
languageInput.addEventListener('change', () => {
    const value = languageInput.value;
    if (value !== 'en' && value !== 'ru' && value !== 'ro') return;
    language = value;
    try { localStorage.setItem('pursuit-language', language); } catch { /* Optional preference storage. */ }
    applyLanguage();
});
switchBtn.addEventListener('click', () => {
    flipped = !flipped;
    switchBtn.style.flexDirection = flipped ? 'row-reverse' : 'row';
    mainDiv.style.flexDirection = flipped ? 'row-reverse' : 'row';
    mainDiv.classList.toggle('flipped', flipped);
});
playBtn.addEventListener('click', () => {
    if (simulation.state === 'RUNNING') simulation.pause();
    else {
        if (simulation.state === 'COMPLETE') reset();
        simulation.play();
    }
    lastFrame = undefined;
    updateButtons();
});
stopBtn.addEventListener('click', reset);
element<HTMLFormElement>('settings').addEventListener('submit', event => event.preventDefault());
countInput.addEventListener('input', () => {
    const nextCircle = Number(countInput.value) > MAX_FINITE_N;
    // Preserve physical perimeter when entering/leaving the ideal circle.
    if (nextCircle && config.mode === 'polygon' && config.sizeMode === 'side') {
        config.size *= config.count;
        config.sizeMode = 'perimeter';
        sizeMode.value = 'perimeter';
    }
    config.mode = nextCircle ? 'circle' : 'polygon';
    if (!nextCircle) config.count = Number(countInput.value);
    syncSizeSlider();
    updatePolygonLabel();
    reset();
});
sizeMode.addEventListener('change', () => {
    const next = sizeMode.value as Configuration['sizeMode'];
    if (next !== config.sizeMode) config.size *= next === 'perimeter' ? config.count : 1 / config.count;
    config.sizeMode = next;
    syncSizeSlider();
    reset();
});
sizeInput.addEventListener('input', () => {
    if (!sizeInput.checkValidity()) { sizeInput.reportValidity(); sizeInput.value = String(config.size); return; }
    config.size = Number(sizeInput.value);
    updateSliderLabels();
    reset();
});
speedInput.addEventListener('input', () => {
    if (!speedInput.checkValidity()) return;
    config.speed = Number(speedInput.value);
    simulation.setSpeed(config.speed);
    updateSliderLabels();
    updateStats();
});
speedInput.addEventListener('change', () => {
    if (!speedInput.checkValidity()) { speedInput.reportValidity(); speedInput.value = String(config.speed); }
});
zoomInput.addEventListener('input', () => {
    autoZoom.checked = false;
    renderer.setManualZoom(10 ** Number(zoomInput.value));
});
autoZoom.addEventListener('change', () => { renderer.setAutoZoom(autoZoom.checked); });
offCenter.addEventListener('change', () => {
    renderer.setOffCenter(offCenter.checked);
    updateNavigationMode();
});
element<HTMLButtonElement>('center-view').addEventListener('click', () => {
    renderer.setAutoZoom(true);
    autoZoom.checked = true;
    renderer.render(simulation, 0);
    zoomInput.value = String(Math.log10(renderer.zoom));
    element<HTMLOutputElement>('zoom-label').value = `${number(renderer.zoom * 100, 0)}%`;
});
trails.addEventListener('change', () => {
    renderer.showTrails = simulation.trailsEnabled = trails.checked;
});
for (const [id, property] of [['outline', 'showOutline'], ['center', 'showCenter'], ['vectors', 'showVectors']] as const) {
    element<HTMLInputElement>(id).addEventListener('change', event => {
        renderer[property] = (event.target as HTMLInputElement).checked;
    });
}
document.addEventListener('visibilitychange', () => { lastFrame = undefined; accumulator = 0; });

// Exactly one animation loop, owned here (never started by a button).
function frame(now: number) {
    const dt = lastFrame === undefined || document.hidden ? 0 : Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    if (simulation.state === 'RUNNING') {
        accumulator += dt;
        while (accumulator >= FIXED_STEP && simulation.state === 'RUNNING') {
            simulation.step();
            accumulator -= FIXED_STEP;
        }
    }
    if (simulation.state !== previousState) {
        previousState = simulation.state;
        if (simulation.state === 'COMPLETE') accumulator = 0;
        updateButtons();
    }
    renderer.render(simulation, dt);
    if (now - lastStats > 100) {
        updateStats();
        element<HTMLOutputElement>('zoom-label').value = `${number(renderer.zoom * 100, 0)}%`;
        if (renderer.autoZoom) zoomInput.value = String(Math.log10(renderer.zoom));
        lastStats = now;
    }
    requestAnimationFrame(frame);
}

badge?.addEventListener('click', () => {
    console.log("Confirmat si facut de Nicolas Dormenco");
});
syncSizeSlider();
applyLanguage();
requestAnimationFrame(frame);
