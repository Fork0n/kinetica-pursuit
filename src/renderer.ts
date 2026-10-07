import type { PursuitSimulation } from './simulation';

export class PursuitRenderer {
    autoZoom = true;
    offCenter = false;
    zoom = 1;
    showTrails = true;
    showOutline = true;
    showCenter = true;
    showVectors = false;
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private scale = 1;
    private fitScale = 1;
    private width = 1;
    private height = 1;
    private cameraX = 0;
    private cameraY = 0;
    private resetScale = true;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas 2D is unavailable');
        this.context = context;
    }
    reset() { this.resetScale = true; this.cameraX = 0; this.cameraY = 0; }
    setOffCenter(enabled: boolean) {
        this.offCenter = enabled;
        if (!enabled) { this.cameraX = 0; this.cameraY = 0; }
    }
    setManualZoom(zoom: number) {
        if (!Number.isFinite(zoom) || zoom <= 0) return;
        this.autoZoom = false;
        this.zoom = Math.max(0.01, Math.min(1e7, zoom));
        this.scale = this.fitScale * this.zoom;
    }
    setAutoZoom(enabled: boolean) {
        this.autoZoom = enabled;
        if (enabled) this.reset();
    }
    screenToWorld(x: number, y: number) {
        return { x: this.cameraX + (x - this.width / 2) / this.scale,
            y: this.cameraY + (y - this.height / 2) / this.scale };
    }
    zoomAt(factor: number, x: number, y: number) {
        if (!Number.isFinite(factor) || factor <= 0) return;
        if (!this.offCenter) { this.setManualZoom(this.zoom * factor); return; }
        const anchor = this.screenToWorld(x, y);
        this.setManualZoom(this.zoom * factor);
        this.cameraX = anchor.x - (x - this.width / 2) / this.scale;
        this.cameraY = anchor.y - (y - this.height / 2) / this.scale;
    }
    pan(dx: number, dy: number) {
        if (!this.offCenter) return;
        if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
        this.autoZoom = false;
        this.cameraX -= dx / this.scale;
        this.cameraY -= dy / this.scale;
    }

    render(sim: PursuitSimulation, frameDelta: number) {
        const rect = this.canvas.getBoundingClientRect();
        const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
        this.width = width; this.height = height;
        const dpr = window.devicePixelRatio || 1;
        const w = Math.round(width * dpr), h = Math.round(height * dpr);
        const resized = this.canvas.width !== w || this.canvas.height !== h;
        if (resized) { this.canvas.width = w; this.canvas.height = h; }
        const ctx = this.context;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        const available = Math.max(1, Math.min(width, height) * 0.40 - 4);
        const fitScale = available / sim.initialRadius;
        this.fitScale = fitScale;
        let extent = 0;
        for (let i = 0; i < sim.count; i++) {
            extent = Math.max(extent, Math.hypot(sim.positions[2 * i], sim.positions[2 * i + 1]));
        }
        // Follow the live radius, not historical geometry. Freeze at completion.
        const target = this.autoZoom ? (sim.state === 'COMPLETE' && !this.resetScale ? this.scale :
            available / Math.max(extent, sim.initialRadius * 1e-7)) : fitScale * this.zoom;
        if (this.resetScale || resized) { this.scale = target; this.resetScale = false; }
        else if (!this.autoZoom) this.scale = target;
        else {
            this.scale *= Math.exp(Math.log(target / this.scale) * (1 - Math.exp(-frameDelta * 10)));
            this.scale = Math.min(target, Math.max(target * 0.95, this.scale));
        }
        if (this.autoZoom) this.zoom = this.scale / fitScale;
        const x = (value: number) => width / 2 + (value - this.cameraX) * this.scale;
        const y = (value: number) => height / 2 + (value - this.cameraY) * this.scale;
        const polygon = (positions: Float64Array) => {
            ctx.beginPath();
            for (let i = 0; i < sim.count; i++) {
                if (i === 0) ctx.moveTo(x(positions[0]), y(positions[1]));
                else ctx.lineTo(x(positions[2 * i]), y(positions[2 * i + 1]));
            }
            ctx.closePath(); ctx.stroke();
        };
        if (this.showOutline) {
            ctx.lineWidth = 1; ctx.strokeStyle = '#70645450'; ctx.setLineDash([5, 5]);
            if (sim.config.mode === 'circle') {
                ctx.beginPath(); ctx.arc(x(0), y(0), sim.initialRadius * this.scale, 0, 2 * Math.PI); ctx.stroke();
            } else polygon(sim.initialPositions);
            ctx.setLineDash([]); ctx.strokeStyle = '#70645490';
            polygon(sim.positions);
        }
        if (this.showTrails) {
            ctx.lineWidth = 1.2;
            for (let i = 0; i < sim.count; i++) {
                const trail = sim.trails[i];
                ctx.strokeStyle = `hsla(${i * 360 / sim.count}, 45%, 37%, 0.5)`;
                ctx.beginPath();
                for (let k = 0; k < trail.length; k++) {
                    const j = trail.index(k);
                    if (k === 0) ctx.moveTo(x(trail.points[j]), y(trail.points[j + 1]));
                    else ctx.lineTo(x(trail.points[j]), y(trail.points[j + 1]));
                }
                if (trail.length) ctx.lineTo(x(sim.positions[2 * i]), y(sim.positions[2 * i + 1]));
                ctx.stroke();
            }
        }
        if (this.showCenter) {
            ctx.strokeStyle = '#5d5142'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x(0) - 5, y(0)); ctx.lineTo(x(0) + 5, y(0));
            ctx.moveTo(x(0), y(0) - 5); ctx.lineTo(x(0), y(0) + 5); ctx.stroke();
        }
        for (let i = 0; i < sim.count; i++) {
            const j = i * 2, k = ((i + 1) % sim.count) * 2;
            const px = x(sim.positions[j]), py = y(sim.positions[j + 1]);
            ctx.fillStyle = `hsl(${i * 360 / sim.count}, 50%, 32%)`;
            ctx.strokeStyle = ctx.fillStyle;
            if (this.showVectors && sim.state !== 'COMPLETE') {
                const dx = sim.config.mode === 'circle' ? -sim.positions[j + 1] : sim.positions[k] - sim.positions[j];
                const dy = sim.config.mode === 'circle' ? sim.positions[j] : sim.positions[k + 1] - sim.positions[j + 1];
                const length = Math.hypot(dx, dy);
                if (length > 1e-15) {
                    const ux = dx / length, uy = dy / length;
                    const arrow = Math.min(45, Math.max(12, sim.config.speed * 0.4 * this.scale));
                    const ex = px + ux * arrow, ey = py + uy * arrow;
                    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey);
                    ctx.lineTo(ex - ux * 5 + uy * 3, ey - uy * 5 - ux * 3);
                    ctx.moveTo(ex, ey); ctx.lineTo(ex - ux * 5 - uy * 3, ey - uy * 5 + ux * 3); ctx.stroke();
                }
            }
            ctx.beginPath(); ctx.arc(px, py, sim.count > 64 ? 2 : 3.5, 0, 2 * Math.PI); ctx.fill();
        }
    }
}
