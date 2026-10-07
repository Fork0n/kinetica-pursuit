export const FIXED_STEP = 1 / 240;
export const MAX_FINITE_N = 256;
export const CIRCLE_SAMPLES = 64;
export type RunState = 'INITIAL' | 'RUNNING' | 'PAUSED' | 'COMPLETE';
export interface Configuration {
    mode: 'polygon' | 'circle';
    count: number;
    speed: number;
    sizeMode: 'side' | 'perimeter';
    size: number;
}

/** Bounded ring buffer: history never grows during an indefinite orbit. */
export class Trail {
    readonly points = new Float64Array(1024 * 2);
    length = 0;
    private start = 0;
    add(x: number, y: number) {
        const index = (this.start + this.length) % 1024;
        this.points[index * 2] = x;
        this.points[index * 2 + 1] = y;
        if (this.length < 1024) this.length++;
        else this.start = (this.start + 1) % 1024;
    }
    index(i: number) { return ((this.start + i) % 1024) * 2; }
}

// World units: meters/seconds; positive y points down for clockwise pursuit.
export class PursuitSimulation {
    readonly config: Configuration;
    readonly count: number;
    readonly initialRadius: number;
    readonly radialFraction: number;
    readonly positions: Float64Array;
    readonly initialPositions: Float64Array;
    readonly travelled: Float64Array;
    readonly trails: Trail[];
    state: RunState = 'INITIAL';
    elapsed = 0;
    commandedDistance = 0;
    trailsEnabled = true;
    private trailClock = 0;
    private readonly stages: Float64Array[];
    private readonly temporary: Float64Array;

    constructor(config: Configuration) {
        if (!Number.isFinite(config.speed) || config.speed <= 0 ||
            !Number.isFinite(config.size) || config.size <= 0 ||
            !Number.isInteger(config.count) || config.count < 3 || config.count > MAX_FINITE_N) {
            throw new RangeError('Invalid pursuit configuration');
        }
        this.config = { ...config, sizeMode: config.mode === 'circle' ? 'perimeter' : config.sizeMode };
        this.count = config.mode === 'circle' ? CIRCLE_SAMPLES : config.count;
        this.radialFraction = config.mode === 'circle' ? 0 : Math.sin(Math.PI / this.count);
        this.initialRadius = config.mode === 'circle' ? config.size / (2 * Math.PI) :
            config.size / (2 * this.radialFraction * (config.sizeMode === 'perimeter' ? this.count : 1));
        this.positions = new Float64Array(this.count * 2);
        for (let i = 0; i < this.count; i++) {
            const angle = -Math.PI / 2 + i * 2 * Math.PI / this.count;
            this.positions[2 * i] = this.initialRadius * Math.cos(angle);
            this.positions[2 * i + 1] = this.initialRadius * Math.sin(angle);
        }
        this.initialPositions = this.positions.slice();
        this.travelled = new Float64Array(this.count);
        this.trails = Array.from({ length: this.count }, () => new Trail());
        this.stages = Array.from({ length: 4 }, () => new Float64Array(this.count * 2));
        this.temporary = new Float64Array(this.count * 2);
    }

    play() { if (this.state === 'INITIAL' || this.state === 'PAUSED') this.state = 'RUNNING'; }
    pause() { if (this.state === 'RUNNING') this.state = 'PAUSED'; }
    setSpeed(speed: number) {
        if (Number.isFinite(speed) && speed > 0) this.config.speed = speed;
    }
    get expectedRadius() {
        return Math.max(0, this.initialRadius - this.commandedDistance * this.radialFraction);
    }
    get meetingTime() {
        return this.config.mode === 'circle' ? Infinity :
            this.elapsed + this.expectedRadius / (this.config.speed * this.radialFraction);
    }
    get outcome() {
        return this.config.mode === 'circle' ? 'Stable orbit' :
            this.radialFraction < 0.05 ? 'Quasi-orbit / eventual convergence' : 'Converging';
    }

    // Each RK stage reads one complete position snapshot.
    private velocities(positions: Float64Array, output: Float64Array) {
        for (let i = 0; i < this.count; i++) {
            const a = 2 * i, b = 2 * ((i + 1) % this.count);
            const dx = positions[b] - positions[a], dy = positions[b + 1] - positions[a + 1];
            const length = Math.hypot(dx, dy);
            const factor = length > 1e-15 ? this.config.speed / length : 0;
            output[a] = dx * factor;
            output[a + 1] = dy * factor;
        }
    }

    private integrate(dt: number) {
        const p = this.positions;
        if (this.config.mode === 'circle') {
            const angle = this.config.speed * dt / this.initialRadius;
            const c = Math.cos(angle), s = Math.sin(angle);
            for (let i = 0; i < this.count; i++) {
                const x = p[2 * i], y = p[2 * i + 1];
                p[2 * i] = x * c - y * s;
                p[2 * i + 1] = x * s + y * c;
                this.travelled[i] += this.config.speed * dt; // Exact circular arc length.
            }
            return;
        }
        const [a, b, c, d] = this.stages;
        this.velocities(p, a);
        for (let j = 0; j < p.length; j++) this.temporary[j] = p[j] + a[j] * dt / 2;
        this.velocities(this.temporary, b);
        for (let j = 0; j < p.length; j++) this.temporary[j] = p[j] + b[j] * dt / 2;
        this.velocities(this.temporary, c);
        for (let j = 0; j < p.length; j++) this.temporary[j] = p[j] + c[j] * dt;
        this.velocities(this.temporary, d);
        for (let i = 0; i < this.count; i++) {
            const j = i * 2;
            const dx = dt * (a[j] + 2 * b[j] + 2 * c[j] + d[j]) / 6;
            const dy = dt * (a[j + 1] + 2 * b[j + 1] + 2 * c[j + 1] + d[j + 1]) / 6;
            p[j] += dx;
            p[j + 1] += dy;
            this.travelled[i] += Math.hypot(dx, dy);
        }
    }

    step(dt = FIXED_STEP) {
        if (this.state !== 'RUNNING' || !Number.isFinite(dt) || dt <= 0) return;
        let remaining = Math.min(dt, FIXED_STEP);
        const epsilon = Math.min(1e-5, this.initialRadius * 1e-5);
        if (this.trailsEnabled && this.trails[0].length === 0) this.recordTrails();
        let substeps = 0;
        while (remaining > 1e-12 && substeps++ < 512) {
            const radius = this.expectedRadius;
            if (this.config.mode === 'polygon' && radius <= epsilon) {
                this.positions.fill(0);
                this.state = 'COMPLETE';
                if (this.trailsEnabled) this.recordTrails();
                break;
            }
            // Limit substeps by neighbor distance to keep high-N pursuit stable.
            const edge = this.config.mode === 'circle' ? Infinity :
                2 * radius * this.radialFraction;
            const h = Math.min(remaining, edge * 0.2 / this.config.speed);
            this.integrate(h);
            this.elapsed += h;
            this.commandedDistance += this.config.speed * h;
            remaining -= h;
            this.trailClock += h;
            if (this.trailsEnabled && this.trailClock >= 1 / 30) {
                this.recordTrails();
                this.trailClock %= 1 / 30;
            }
        }
    }

    private recordTrails() {
        for (let i = 0; i < this.count; i++) this.trails[i].add(this.positions[2 * i], this.positions[2 * i + 1]);
    }

    metrics() {
        let radius = 0, neighbor = 0, distance = 0;
        let minRadius = Infinity, maxRadius = 0, minNeighbor = Infinity, maxNeighbor = 0;
        for (let i = 0; i < this.count; i++) {
            const j = i * 2, k = ((i + 1) % this.count) * 2;
            const r = Math.hypot(this.positions[j], this.positions[j + 1]);
            const side = Math.hypot(this.positions[j] - this.positions[k], this.positions[j + 1] - this.positions[k + 1]);
            radius += r; neighbor += side; distance += this.travelled[i];
            minRadius = Math.min(minRadius, r); maxRadius = Math.max(maxRadius, r);
            minNeighbor = Math.min(minNeighbor, side); maxNeighbor = Math.max(maxNeighbor, side);
        }
        radius /= this.count;
        return {
            radius, neighbor: neighbor / this.count, travelled: distance / this.count,
            radiusSpread: maxRadius - minRadius, neighborSpread: maxNeighbor - minNeighbor,
            // Normalize by R0 so the error remains meaningful at convergence.
            errorPercent: Math.abs(radius - this.expectedRadius) / this.initialRadius * 100,
        };
    }
}
