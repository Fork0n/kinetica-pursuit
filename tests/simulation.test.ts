import { describe, expect, test } from 'bun:test';
import { FIXED_STEP, PursuitSimulation } from '../src/simulation';

function create(count = 4, size = 20, speed = 2, mode: 'polygon' | 'circle' = 'polygon') {
    return new PursuitSimulation({ mode, count, size, speed, sizeMode: 'perimeter' });
}
describe('cyclic pursuit', () => {
    for (const n of [3, 4, 8, 64, 256]) {
        test(`N=${n}: symmetry, radial law and eventual completion`, () => {
            const sim = create(n, 1, 10);
            const meeting = sim.meetingTime;
            sim.play();
            let ticks = 0;
            while (sim.state === 'RUNNING' && ticks++ < 100000) {
                sim.step();
                const m = sim.metrics();
                expect(m.errorPercent).toBeLessThan(0.02);
                expect(m.radiusSpread / sim.initialRadius).toBeLessThan(1e-5);
                expect(m.neighborSpread / sim.initialRadius).toBeLessThan(1e-5);
            }
            expect(sim.state).toBe('COMPLETE');
            expect(Math.abs(sim.elapsed - meeting) / meeting).toBeLessThan(0.0001);
            expect(Math.abs(sim.metrics().travelled - 10 * sim.elapsed) / (10 * sim.elapsed)).toBeLessThan(0.005);
            expect(sim.positions.every(Number.isFinite)).toBe(true);
        });
    }
    test('clockwise motion, pause, resume, and live speed', () => {
        const sim = create();
        sim.play(); sim.step();
        expect(sim.positions[0]).toBeGreaterThan(0);
        const before = sim.positions.slice(), time = sim.elapsed;
        sim.pause(); sim.step();
        expect(sim.elapsed).toBe(time);
        expect(sim.positions).toEqual(before);
        sim.setSpeed(4);
        expect(sim.positions).toEqual(before);
        const meeting = sim.meetingTime;
        sim.play(); sim.step();
        expect(sim.elapsed).toBeCloseTo(time + FIXED_STEP, 10);
        expect(sim.meetingTime).toBeCloseTo(meeting, 9);
    });
    test('ideal circle stays circular with bounded trails', () => {
        const sim = create(64, 20, 2, 'circle');
        sim.play();
        for (let i = 0; i < 24000; i++) sim.step();
        expect(sim.state).toBe('RUNNING');
        expect(sim.meetingTime).toBe(Infinity);
        expect(sim.metrics().radius).toBeCloseTo(sim.initialRadius, 9);
        expect(sim.metrics().travelled).toBeCloseTo(2 * sim.elapsed, 8);
        expect(sim.trails[0].length).toBe(1024);
        const length = sim.trails[0].length;
        const history = sim.trails[0].points.slice();
        sim.trailsEnabled = false;
        for (let i = 0; i < 100; i++) sim.step();
        expect(sim.trails[0].length).toBe(length);
        expect(sim.trails[0].points).toEqual(history);
    });
    test('side/perimeter equivalence, clean reset, tiny high-speed polygon', () => {
        const side = new PursuitSimulation({ mode: 'polygon', count: 4, size: 5, sizeMode: 'side', speed: 2 });
        expect(side.positions).toEqual(create().positions);
        const fresh = create();
        expect(fresh.elapsed).toBe(0);
        expect(fresh.metrics().travelled).toBe(0);
        expect(fresh.trails.every(trail => trail.length === 0)).toBe(true);
        const tiny = create(256, 0.01, 1000);
        tiny.play();
        for (let i = 0; i < 1000 && tiny.state === 'RUNNING'; i++) tiny.step();
        expect(tiny.state).toBe('COMPLETE');
        expect(tiny.positions.every(Number.isFinite)).toBe(true);
    });
});
