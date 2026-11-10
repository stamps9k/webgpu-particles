# webgpu-particles

A TypeScript library of GPU-accelerated particle effects built on the [WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API). Each effect is implemented as a set of paired WGSL compute, vertex, and fragment shaders, all running in pixel space for predictable, resolution-aware simulation.

> **Live demo:** [stampatron.com](https://stampatron.com) <!-- update if URL differs -->

---

## Features

- 🚀 **WebGPU-native** — GPU compute shaders for particle simulation; no Canvas 2D or WebGL fallback
- 🎨 **Multiple effects** — Scatter Fade, Scatter Swirl, Fireworks and Boids. More to follow in time.
- 📦 **Zero runtime dependencies**
- 🔌 **Flexible emitters** — Point, circle, and rectangle emitter types
- 🧩 **Typed API** — Full TypeScript declarations included
- ⚡ **Lightweight** — Ships as a single `.mjs` bundle with `.d.ts` declarations

---

## Requirements

- A browser with [WebGPU support](https://caniuse.com/webgpu) (Chrome 113+, Edge 113+)
- Node.js 22.18+ (for build tooling; required by tsup 9)

---

## Installation

Install directly from the distribution repo via npm:

```bash
npm install github:stamps9k/webgpu-particles-dist
```

---

## Usage

```ts
import {
  init,
  ScatterFadeEffect,
  EmitterConfig,
  EmitterShape,
} from "webgpu-particles";

const canvas = document.querySelector("canvas") as HTMLCanvasElement;

const engine = await init(
  canvas,
  new ScatterFadeEffect(10000),
  new EmitterConfig(
    EmitterShape.Point,
    [canvas.width / 2, canvas.height / 2],
    null,
    null,
  ),
);

// Start the render loop
engine.start();

// Later
engine.pause();
engine.resume();
// TODO: stop() and destroy()
```

> See the [demo app](https://github.com/stamps9k/webgpu-particles-demo) for full working examples of every effect.

---

## Effects

Each effect is a class passed to `init()`. Every effect takes a maximum particle count (1 to 100,000).

| Class                | Description                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `ScatterFadeEffect`  | Particles burst out from the emitter, fall under gravity and fade out over their lifetime           |
| `ScatterSwirlEffect` | Particles spiral around the emitter like a vortex, inner particles spinning fastest                 |
| `FireworksEffect`    | Two-phase effect: rockets launch upward, then burst into radial sparks with motion-trail stretching |
| `BoidsEffect`        | Flocking simulation (separation, alignment, cohesion) with tunable radii, weights, speed and force  |

```ts
new ScatterFadeEffect(max_particles);
new ScatterSwirlEffect(max_particles);
new FireworksEffect(max_particles, rocket_count); // rocket_count <= max_particles / 2
new BoidsEffect(
  max_particles,
  perception_radius,
  separation_radius,
  separation_weight,
  alignment_weight,
  cohesion_weight,
  max_speed,
  max_force,
);
```

`init()` validates the effect and emitter before starting and rejects invalid values with a message.

---

## Emitters

Emitters are described with an `EmitterConfig`: a shape, a position in canvas pixels, and two shape parameters (`null` where unused).

```ts
// Point emitter
new EmitterConfig(EmitterShape.Point, [x, y], null, null);

// Circle emitter: particles spawn anywhere within the radius
new EmitterConfig(EmitterShape.Circle, [x, y], radius, null);

// Rectangle emitter: particles spawn anywhere within the bounds
new EmitterConfig(EmitterShape.Rectangle, [x, y], width, height);
```

A running engine can move or reshape its emitter with `engine.update_emitter(new EmitterConfigPatch(...))`, where any field left `null` keeps its current value.

---

## Shader Parameters

Each effect can use up to eleven generic shader parameter slots (`sp0`–`sp10`), filled from the effect's settings by its `get_shader_params()` method. Each shader declares only the slots it reads (Boids uses `sp0`–`sp6`; Fireworks and Scatter Swirl use the first few).

The uniforms layout passed to every shader is:

| Field         | Type    | Description                    |
| ------------- | ------- | ------------------------------ |
| `deltaTime`   | `f32`   | Frame delta in seconds         |
| `time`        | `f32`   | Total elapsed time in seconds  |
| `canvasSize`  | `vec2f` | Canvas dimensions in pixels    |
| `emitterPos`  | `vec2f` | Emitter origin in pixel space  |
| `emitterType` | `f32`   | Discriminant for emitter shape |
| `emitterP1`   | `f32`   | Emitter shape parameter 1      |
| `emitterP2`   | `f32`   | Emitter shape parameter 2      |
| `sp0`–`sp10`  | `f32`   | Per-effect shader parameters   |

---

## Architecture

### Coordinate system

All simulation runs in **canvas pixel space** (origin top-left, Y increases downward). Velocities are in **pixels per second**. The conversion from pixel space to clip space happens exclusively in the vertex shader, so compute shader logic never needs to account for aspect ratio or canvas size when updating positions.

### Shader structure

Each effect lives under `src/internal/shaders/[name]/` and consists of three files:

```
src/internal/shaders/
└── fireworks/
    ├── fireworks.comp.wgsl   # Compute shader — particle simulation
    ├── fireworks.vert.wgsl   # Vertex shader — pixel → clip space, quad generation
    └── fireworks.frag.wgsl   # Fragment shader — colour, alpha, visual style
```

### Particle struct

```wgsl
struct Particle {
  position : vec2f,
  velocity : vec2f,
  color    : vec4f,
  seed     : f32,
  life     : f32,
  maxLife  : f32,
  size     : f32,
}
```

---

## Development

### Repo structure

```
webgpu-particles/
├── .husky/           # Git hooks for linting and prettifying on commit
├── src/
│   ├── internal/
│   │   └── shaders/  # WGSL shader source
│   ├── public/
│   │   ├── effects/  # Class definitions for effects
│   │   ├── enums/    # Public enums
│   │   └── types/    # Public types
│   └── index.ts      # Public API surface
├── tests/            # vitest suites
└── package.json
```

### Build

```bash
npm run build
```

The build runs `tsup` (produces `.mjs`), then `tsc --emitDeclarationOnly` (produces `.d.ts`), then writes a trimmed `dist/package.json`. `npm run dev` runs the same two steps in watch mode in parallel via `concurrently`. Output is written to `dist/` and then pushed to the [`webgpu-particles-dist`](https://github.com/stamps9k/webgpu-particles-dist) repo for npm installation.

### Tests

```bash
npx vitest run
```

The vitest suites in `tests/` cover the CPU-side code: validation, effect settings, particle seeding and shader parameters. Rendering needs a GPU and isn't covered. The pre-commit hook runs them on every commit.

### Type checking only

```bash
npx tsc --noEmit
```

---

## Browser Compatibility

| Browser            | Support                                          |
| ------------------ | ------------------------------------------------ |
| Chrome / Edge 113+ | ✅ Full support                                  |
| Firefox            | 🚧 Experimental (flag required)                  |
| Safari             | 🚧 In progress (WebGPU behind flag on macOS 14+) |

---

## License

GPL-3.0 license
