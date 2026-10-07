# Drone pursuit

[English](README.md) · [Русский](README.ru.md) · [Română](README.ro.md)

A cyclic pursuit simulation for Wine Dynamics / Project Kinetica. Each drone chases the next one clockwise. All drones use the same speed, and all positions update together.

## Run it

```sh
bun install
bun --bun run dev
```

For a production build and the checks:

```sh
bun --bun run build
bun test
```

## Controls

- **Language:** English, Russian or Romanian. English is the initial default. The choice is saved in this browser when local storage is available. Changing language does not reset the simulation.
- **Shape:** 3–256 drones, followed by a separate **Circle / ∞** mode. All 254 finite polygons have full names, from Triangle to Dihectapentacontahexagon, with the side count alongside.
- **Speed:** 0.1–50 m/s. Changes apply immediately, including while paused. Positions and elapsed time stay intact.
- **Length:** a slider for side length or total perimeter. The usual range is 0.1–100 m per side; the perimeter range scales with the drone count. Changing the measurement converts the value to preserve the physical size. Bounds expand when needed to retain a converted value. Circle mode uses circumference.
- **Play / Pause:** start, suspend or resume. Paused time does not accumulate. Play after completion starts a new run.
- **Stop:** full reset of positions, time, travelled distance and trails. Shape and size changes also reset the run.
- **Switch:** exchange the two panes. On a narrow screen, exchange their vertical order.

Rendering options control trails, the initial/current outline, the center mark and velocity arrows. They do not change the physics. Each checkbox uses a `.toggle` label with an input and a `.toggle-indicator`; the indicator can later be restyled as a two-position switch without changing the logic.

Auto zoom follows the live drone radius, keeping approximately 10% of the shorter viewport dimension clear on each side. It uses the radial envelope rather than a rotating bounding box, so polygon rotation does not make the camera pulse. Scale changes are smoothed with a small tracking tolerance. Old trails and the initial outline may be cropped. The camera stops zooming at completion. Manual zoom disables auto zoom. Neither resizing nor zoom changes physical coordinates.

## Physics

Let `N` be the drone count, `v` the speed in m/s, `s` the initial side length and `P` the initial perimeter. The initial circumradius is:

```text
s = P / N
R0 = s / (2 sin(π/N)) = P / (2N sin(π/N))
```

At each integration stage, drone `i` gets a velocity pointing toward drone `(i + 1) mod N`:

```text
velocity[i] = v × (position[next] − position[i])
                / |position[next] − position[i]|
```

Every velocity is calculated from the same position snapshot before any positions change. The engine uses fourth-order Runge–Kutta integration with fixed 1/240 s ticks and smaller substeps near convergence. It simulates pursuit directly; it does not draw an analytical spiral and put drones on it.

In the symmetric regular case, the chord toward the next drone points inward at angle `π/N` from the tangent. That gives:

```text
radialSpeed = v sin(π/N)
tangentialSpeed = v cos(π/N)
R(t) = R0 − v sin(π/N)t
T = R0 / (v sin(π/N)) = s / (2v sin²(π/N))
```

The shrinking radius and continuing rotation produce logarithmic spirals. These formulas provide predictions and accuracy checks. If speed changes, expected radius uses accumulated `∫v dt`; the meeting statistic predicts the total time from the start assuming the new speed continues.

For every finite `N`, `sin(π/N)` is positive. A high-sided polygon can look like an orbit but still converges. The UI calls it a quasi-orbit when the radial fraction is below 0.05.

**Circle mode is a separate ideal limit.** Its radial speed is zero, tangential speed is `v`, and meeting time is infinite. The renderer shows 64 samples rotating at angular speed `v/R`; those samples are not a finite pursuit polygon. Its radius is `P/(2π)`.

Finite runs finish when the theoretical remaining radius falls below `min(10⁻⁵ m, R0 × 10⁻⁵)`. The drones are then placed at the center and physics stops. This avoids the numerical singularity at exact coincidence.

## Statistics and accuracy

The top row shows simulation time, mean neighbor distance, mean radius, mean distance travelled per drone, predicted meeting time and state. Open **Physics & accuracy** for radial/tangential velocity and errors.

```text
radiusError (%) = |simulatedRadius − expectedRadius| / R0 × 100
```

Normalizing by the initial radius keeps the error defined at the meeting point. Finite-polygon path length sums numerical displacements; circle mode uses exact arc lengths. The path error compares this with `∫v dt`. Hover over the accuracy text for radius and neighbor-distance spreads.

Trails store at most 1,024 samples per drone, recorded at up to 30 Hz of simulation time. Hidden trails stop recording. Long runs replace the oldest points. Frame delays are clamped to 0.1 s; returning from a background tab does not catch up the hidden time. Extremely small, fast polygons may hit the bounded substep workload and run slower than wall-clock time. The time shown is always integrated simulation time.

## Files

- `src/simulation.ts`: physics, state and measurements; no DOM dependencies.
- `src/renderer.ts`: canvas drawing, zoom and device pixel ratio.
- `src/main.ts`: controls, statistics and one animation loop.
- `src/i18n.ts`: English, Russian and Romanian UI text and polygon names.
- `src/main.css`: the original buttons plus the settings layout and checkbox indicators.
- `tests/`: physics, camera and DOM-harness checks. These do not replace a browser visual review.

## Explanations and camera navigation

**Off-center navigation is off by default.** Zoom stays anchored to the original center and panning is disabled. Enable the toggle for the free-camera gestures below. Turning it off recenters without changing the zoom level, Auto zoom setting or simulation state. The Center button still recenters and restores Auto zoom.

Click any `(?)` for an explanation of what a quantity means, why it matters and how it is calculated. The help works with mouse, touch and keyboard. The state help distinguishes a finite quasi-orbit from an ideal stable orbit. Close the dialog with its button or Escape. Reading help does not pause the simulation; pause first if you want to inspect one moment.

On the canvas, scroll to zoom around the pointer and drag to pan away from the original center. Touch supports one-finger panning and two-finger pinch zoom. With the canvas focused, use +/− to zoom, arrow keys to move the camera, and Home to recenter and resume auto zoom. Double-clicking or enabling Auto zoom does the same. The zoom slider scales around your current camera center, so it also works after panning. Camera movement never moves the drones in world coordinates.

`src/polygon-names.ts` contains the explicit 254-entry English/Russian/Romanian table. It uses one Greek-prefix naming convention, with localized compounds and familiar names for low counts; these are not claims of unique official spellings. For example, 256 = 200 + 50 + 6 gives dihecta + pentaconta + hexa + gon. References for polygon names and prefixes: [Math.com](https://www.math.com/tables/geometry/polygons.htm), [Math Is Fun](https://www.mathsisfun.com/geometry/polygons.html).

`src/help.ts` contains translated explanations and accessible dialog handling. `src/navigation.ts` binds mouse, touch and keyboard gestures to the renderer camera.

