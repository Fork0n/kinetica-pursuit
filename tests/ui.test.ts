import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { translations, polygonName, savedLanguage } from '../src/i18n';
import { explanations } from '../src/help';
import { POLYGON_NAMES } from '../src/polygon-names';

// Small DOM/canvas harness exercises the actual UI glue without a browser dependency.
class Element {
    value = '';
    checked = true;
    disabled = false;
    alt = '';
    src = '';
    title = '';
    textContent = '';
    dataset: Record<string, string> = {};
    open = false;
    style: Record<string, string> = {};
    attributes: Record<string, string> = {};
    children: Element[] = [];
    classes = new Set<string>();
    listeners: Record<string, ((event: any) => void)[]> = {};
    classList = {
        add: (name: string) => this.classes.add(name),
        toggle: (name: string, enabled: boolean) => enabled ? this.classes.add(name) : this.classes.delete(name),
    };
    appendChild(child: Element) { this.children.push(child); }
    setAttribute(name: string, value: string) { this.attributes[name] = value; }
    addEventListener(name: string, callback: (event: any) => void) { (this.listeners[name] ??= []).push(callback); }
    fire(name: string) { for (const callback of this.listeners[name] ?? []) callback({ target: this, preventDefault() {} }); }
    checkValidity() { return Number.isFinite(Number(this.value)) && Number(this.value) > 0; }
    reportValidity() {}
    showModal() { this.open = true; }
    close() { this.open = false; }
    getBoundingClientRect() { return { width: 800, height: 800 }; }
    getContext() { return new Proxy({}, { get: () => () => {}, set: () => true }); }
}

test('existing controls pause, resume, fully reset, and keep one RAF loop', async () => {
    const elements = new Map<string, Element>();
    const get = (id: string) => {
        if (!elements.has(id)) elements.set(id, new Element());
        return elements.get(id)!;
    };
    get('drone-count').value = '4';
    get('speed').value = '2';
    get('size').value = '20';
    get('size-mode').value = 'side';
    get('off-center').checked = false;
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const translated = [...html.matchAll(/data-i18n="([^"]+)"/g)]
        .map(match => Object.assign(new Element(), { dataset: { i18n: match[1] } }));
    const helpers = [...html.matchAll(/data-help="([^"]+)"/g)]
        .map(match => Object.assign(match[1] === 'state' ? get('state-help') : new Element(), { dataset: { help: match[1] } }));
    const document = { documentElement: { lang: 'en' }, title: '', querySelectorAll: (selector: string) => selector === '[data-help]' ? helpers : translated,
        getElementById: get, createElement: () => new Element(), addEventListener() {}, hidden: false };
    const preferences = new Map<string, string>();
    let queue: FrameRequestCallback[] = [];
    Object.assign(globalThis, { document, window: { devicePixelRatio: 2 },
        localStorage: { getItem: (key: string) => preferences.get(key), setItem: (key: string, value: string) => preferences.set(key, value) },
        requestAnimationFrame: (callback: FrameRequestCallback) => { queue.push(callback); return queue.length; } });
    await import('../src/main');
    let now = 0;
    function frames(count: number) {
        for (let i = 0; i < count; i++) {
            expect(queue.length).toBe(1);
            const callback = queue.shift()!;
            now += 1000 / 60;
            callback(now);
        }
    }
    const time = () => parseFloat(get('stat-time').value);
    const initialRadius = get('stat-radius').value;
    get('play-btn').fire('click');
    expect(get('play-icon').alt).toBe('Pause');
    expect(get('stop-btn').classes.has('appear')).toBe(true);
    frames(60);
    get('play-btn').fire('click');
    const paused = time();
    expect(paused).toBeGreaterThan(0.9);
    frames(120);
    expect(time()).toBe(paused);
    for (const language of ['ru', 'ro', 'en'] as const) {
        get('language').value = language; get('language').fire('change');
        expect(document.documentElement.lang).toBe(language);
        expect(preferences.get('pursuit-language')).toBe(language);
        expect(savedLanguage()).toBe(language);
        expect(get('play-icon').alt).toBe(translations[language].play);
        expect(get('stat-outcome').value).toBe(translations[language].paused);
        expect(translated.every(node => !!node.textContent)).toBe(true);
        helpers.find(button => button.dataset.help === 'physics')!.fire('click');
        expect(get('help-dialog').open).toBe(true);
        expect(get('help-body').textContent).toContain('sin(π/N)');
        expect(get('help-title').textContent).toBe(translations[language].details);
        get('help-close').fire('click');
        expect(get('help-dialog').open).toBe(false);
    }
    expect(time()).toBe(paused);
    get('zoom').value = '1'; get('zoom').fire('input');
    expect(get('auto-zoom').checked).toBe(false);
    expect(time()).toBe(paused);
    expect(get('camera-hint').textContent).toBe(translations.en.navigateCentered);
    get('off-center').checked = true; get('off-center').fire('change');
    expect(get('camera-hint').textContent).toBe(translations.en.navigate);
    get('off-center').checked = false; get('off-center').fire('change');
    expect(get('camera-hint').textContent).toBe(translations.en.navigateCentered);
    expect(get('auto-zoom').checked).toBe(false);
    expect(time()).toBe(paused);
    const pausedRadius = get('stat-radius').value;
    get('center-view').fire('click'); frames(1);
    expect(get('auto-zoom').checked).toBe(true);
    expect(time()).toBe(paused);
    expect(get('stat-radius').value).toBe(pausedRadius);
    expect(get('stat-outcome').value).toBe('Paused');
    expect(get('stop-btn').classes.has('appear')).toBe(true);
    get('play-btn').fire('click'); frames(30);
    expect(time()).toBeGreaterThan(paused);
    get('stop-btn').fire('click'); frames(1);
    expect(time()).toBe(0);
    expect(get('stat-travelled').value).toBe('0.00 m');
    expect(get('stat-radius').value).toBe(initialRadius);
    expect(get('play-icon').alt).toBe('Play');
    expect(get('stop-btn').classes.has('appear')).toBe(false);
    expect(get('ctrl-container').children[0].classes.has('expanded')).toBe(false);
    // Repeated play/pause actions must never spawn more animation loops.
    for (let i = 0; i < 10; i++) get('play-btn').fire('click');
    expect(queue.length).toBe(1);
    get('drone-count').value = '256'; get('drone-count').fire('input');
    expect(get('polygon-label').value).toBe('Dihectapentacontahexagon · 256');
    expect(get('state-help').dataset.help).toBe('quasi');
    get('state-help').fire('click');
    expect(get('help-body').textContent).toContain('not a permanent orbit');
    get('help-close').fire('click');
    get('drone-count').value = '257'; get('drone-count').fire('input');
    expect(get('polygon-label').value).toBe('Circle / ∞');
    expect(get('stat-meeting').value).toBe('∞');
    expect(get('size-mode').disabled).toBe(true);
    get('play-btn').fire('click'); frames(30);
    get('size').value = '40'; get('size').fire('input');
    expect(time()).toBe(0);
    expect(get('stop-btn').classes.has('appear')).toBe(false);
});

test('every finite shape has a precise name in all three languages', () => {
    for (const language of ['en', 'ru', 'ro'] as const) {
        for (let n = 3; n <= 256; n++) expect(polygonName(n, language)).toContain(String(n));
    }
    expect(Object.keys(POLYGON_NAMES).length).toBe(254);
    expect(polygonName(37, 'en')).toBe('Triacontaheptagon · 37');
    expect(polygonName(37, 'ru')).toBe('Триаконтагептагон · 37');
    expect(polygonName(37, 'ro')).toBe('Triacontaheptagon · 37');
    for (const language of ['en', 'ru', 'ro'] as const) {
        expect(new Set(Object.values(POLYGON_NAMES).map(names => names[language])).size).toBe(254);
        for (const text of Object.values(explanations[language])) expect(text.length).toBeGreaterThan(60);
    }
});
