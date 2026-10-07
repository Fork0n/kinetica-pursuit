import { expect, test } from 'bun:test';
import { PursuitSimulation } from '../src/simulation';
import { PursuitRenderer } from '../src/renderer';
import { bindNavigation } from '../src/navigation';

test('auto zoom follows live drones with 10% padding even with outlines and trails', () => {
    Object.assign(globalThis, { window: { devicePixelRatio: 2 } });
    let points: number[][] = [];
    let width = 800;
    const context = new Proxy({}, {
        get: (_, key) => key === 'arc' ? (...args: number[]) => points.push(args) : () => {},
        set: () => true,
    });
    const canvas = { width: 0, height: 0, getContext: () => context,
        getBoundingClientRect: () => ({ width, height: 800 }) };
    const renderer = new PursuitRenderer(canvas as unknown as HTMLCanvasElement);
    const sim = new PursuitSimulation({ mode: 'polygon', count: 4, size: 20, speed: 2, sizeMode: 'side' });
    renderer.render(sim, 0);
    expect(canvas.width).toBe(1600);
    sim.play();
    for (let i = 0; i < 1200; i++) sim.step();
    renderer.render(sim, 1 / 60);
    expect(renderer.zoom).toBeGreaterThan(1.85);
    for (let i = 0; i < 120; i++) renderer.render(sim, 1 / 60);
    points = []; renderer.render(sim, 1 / 60);
    const radiusPixels = Math.max(...points.map(([x, y]) => Math.hypot(x - 400, y - 400)));
    expect(radiusPixels).toBeGreaterThan(315);
    expect(radiusPixels).toBeLessThanOrEqual(316.001);
    expect(sim.trails[0].length).toBeGreaterThan(0);
    const positions = sim.positions.slice();
    width = 600;
    renderer.render(sim, 1 / 60);
    expect(sim.positions).toEqual(positions);
    renderer.setManualZoom(3);
    renderer.render(sim, 1 / 60);
    expect(renderer.autoZoom).toBe(false);
    expect(renderer.zoom).toBe(3);
    renderer.autoZoom = true;
    renderer.render(sim, 1 / 60);
    const before = renderer.zoom;
    sim.state = 'COMPLETE'; sim.positions.fill(0);
    renderer.render(sim, 1 / 60);
    expect(renderer.zoom).toBe(before);
});

test('off-center wheel zoom, drag, pinch, keyboard and recenter preserve physics', () => {
    Object.assign(globalThis, { window: { devicePixelRatio: 2 } });
    const listeners: Record<string, (event: any) => void> = {};
    const canvas = {
        width: 0, height: 0, clientHeight: 600,
        getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }),
        getBoundingClientRect: () => ({ left: 20, top: 30, width: 800, height: 600 }),
        addEventListener: (type: string, callback: (event: any) => void) => { listeners[type] = callback; },
        focus() {}, setPointerCapture() {}, classList: { add() {}, remove() {}, toggle() {} },
    };
    const sim = new PursuitSimulation({ mode: 'polygon', count: 256, size: 20, speed: 2, sizeMode: 'perimeter' });
    const positions = sim.positions.slice();
    const renderer = new PursuitRenderer(canvas as unknown as HTMLCanvasElement);
    renderer.render(sim, 0);
    let changes = 0;
    bindNavigation(canvas as unknown as HTMLCanvasElement, renderer, () => changes++);
    expect(renderer.offCenter).toBe(false);
    listeners.wheel({ clientX: 670, clientY: 180, deltaY: -300, deltaMode: 0, preventDefault() {} });
    expect(renderer.zoom).toBeGreaterThan(1);
    expect(renderer.screenToWorld(400, 300)).toEqual({ x: 0, y: 0 });
    renderer.setAutoZoom(true); renderer.render(sim, 0);
    listeners.pointerdown({ pointerId: 9, pointerType: 'mouse', button: 0, clientX: 420, clientY: 330 });
    listeners.pointermove({ pointerId: 9, clientX: 480, clientY: 360 });
    listeners.pointerup({ pointerId: 9 });
    listeners.keydown({ key: 'ArrowRight', preventDefault() {} });
    expect(renderer.screenToWorld(400, 300)).toEqual({ x: 0, y: 0 });
    expect(renderer.autoZoom).toBe(true);
    listeners.pointerdown({ pointerId: 10, pointerType: 'touch', clientX: 320, clientY: 330 });
    listeners.pointerdown({ pointerId: 11, pointerType: 'touch', clientX: 520, clientY: 330 });
    listeners.pointermove({ pointerId: 11, clientX: 620, clientY: 330 });
    expect(renderer.zoom).toBeCloseTo(1.5, 10);
    expect(renderer.screenToWorld(400, 300)).toEqual({ x: 0, y: 0 });
    listeners.pointerup({ pointerId: 10 }); listeners.pointerup({ pointerId: 11 });
    renderer.setAutoZoom(true); renderer.render(sim, 0);
    renderer.setOffCenter(true);
    const anchor = renderer.screenToWorld(650, 150);
    listeners.wheel({ clientX: 670, clientY: 180, deltaY: -300, deltaMode: 0, preventDefault() {} });
    expect(renderer.autoZoom).toBe(false);
    expect(renderer.zoom).toBeGreaterThan(1);
    const after = renderer.screenToWorld(650, 150);
    expect(after.x).toBeCloseTo(anchor.x, 12);
    expect(after.y).toBeCloseTo(anchor.y, 12);
    const centerBefore = renderer.screenToWorld(400, 300);
    listeners.pointerdown({ pointerId: 1, pointerType: 'mouse', button: 0, clientX: 420, clientY: 330 });
    listeners.pointermove({ pointerId: 1, clientX: 480, clientY: 360 });
    const centerAfter = renderer.screenToWorld(400, 300);
    expect(centerAfter.x).toBeLessThan(centerBefore.x);
    expect(centerAfter.y).toBeLessThan(centerBefore.y);
    listeners.pointerup({ pointerId: 1 });
    const manualCenter = renderer.screenToWorld(400, 300);
    renderer.setManualZoom(4);
    expect(renderer.screenToWorld(400, 300)).toEqual(manualCenter);
    renderer.setOffCenter(false);
    expect(renderer.screenToWorld(400, 300)).toEqual({ x: 0, y: 0 });
    expect(renderer.zoom).toBe(4);
    expect(renderer.autoZoom).toBe(false);
    renderer.setOffCenter(true);
    listeners.pointerdown({ pointerId: 2, pointerType: 'touch', clientX: 320, clientY: 330 });
    listeners.pointerdown({ pointerId: 3, pointerType: 'touch', clientX: 520, clientY: 330 });
    listeners.pointermove({ pointerId: 3, clientX: 620, clientY: 330 });
    expect(renderer.zoom).toBeCloseTo(6, 10);
    listeners.pointercancel({ pointerId: 2 });
    listeners.lostpointercapture({ pointerId: 3 });
    listeners.keydown({ key: 'Home', preventDefault() {} });
    renderer.render(sim, 0);
    expect(renderer.autoZoom).toBe(true);
    expect(renderer.zoom).toBeCloseTo(1, 10);
    expect(renderer.screenToWorld(400, 300)).toEqual({ x: 0, y: 0 });
    listeners.keydown({ key: 'ArrowRight', preventDefault() {} });
    expect(renderer.screenToWorld(400, 300).x).toBeGreaterThan(0);
    listeners.dblclick(); renderer.render(sim, 0);
    expect(renderer.screenToWorld(400, 300)).toEqual({ x: 0, y: 0 });
    expect(changes).toBeGreaterThan(4);
    expect(sim.positions).toEqual(positions);
    expect(sim.elapsed).toBe(0);
});
