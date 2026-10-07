import type { PursuitRenderer } from './renderer';

export function bindNavigation(canvas: HTMLCanvasElement, renderer: PursuitRenderer, onChange: () => void) {
    const pointers = new Map<number, { x: number; y: number }>();
    const point = (event: PointerEvent | WheelEvent) => {
        const rect = canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    canvas.addEventListener('wheel', event => {
        event.preventDefault();
        const p = point(event);
        const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
        renderer.zoomAt(Math.exp(-Math.max(-1000, Math.min(1000, event.deltaY * units)) * 0.002), p.x, p.y);
        onChange();
    }, { passive: false });
    canvas.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        canvas.focus({ preventScroll: true });
        canvas.setPointerCapture(event.pointerId);
        pointers.set(event.pointerId, point(event));
        canvas.classList.toggle('dragging', renderer.offCenter);
    });
    canvas.addEventListener('pointermove', event => {
        const old = pointers.get(event.pointerId);
        if (!old) return;
        const next = point(event);
        const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
        if (other) {
            const before = Math.hypot(old.x - other.x, old.y - other.y);
            const after = Math.hypot(next.x - other.x, next.y - other.y);
            renderer.pan((next.x - old.x) / 2, (next.y - old.y) / 2);
            if (before > 1 && after > 1) renderer.zoomAt(after / before, (next.x + other.x) / 2, (next.y + other.y) / 2);
        } else renderer.pan(next.x - old.x, next.y - old.y);
        pointers.set(event.pointerId, next);
        onChange();
    });
    const release = (event: PointerEvent) => {
        pointers.delete(event.pointerId);
        canvas.classList.toggle('dragging', renderer.offCenter && pointers.size > 0);
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) canvas.addEventListener(type, release);
    const fit = () => { pointers.clear(); canvas.classList.remove('dragging'); renderer.setAutoZoom(true); onChange(); };
    canvas.addEventListener('dblclick', fit);
    canvas.addEventListener('keydown', event => {
        const rect = canvas.getBoundingClientRect();
        switch (event.key) {
            case '+': case '=': renderer.zoomAt(1.2, rect.width / 2, rect.height / 2); break;
            case '-': renderer.zoomAt(1 / 1.2, rect.width / 2, rect.height / 2); break;
            case 'ArrowLeft': renderer.pan(40, 0); break;
            case 'ArrowRight': renderer.pan(-40, 0); break;
            case 'ArrowUp': renderer.pan(0, 40); break;
            case 'ArrowDown': renderer.pan(0, -40); break;
            case 'Home': fit(); break;
            default: return;
        }
        event.preventDefault();
        onChange();
    });
}
