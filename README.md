# webgpu-particles

A TypeScript library of GPU-accelerated particle effects built on the [WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API). Each effect is implemented as a set of paired WGSL compute, vertex, and fragment shaders, all running in pixel space for predictable, resolution-aware simulation.

> **Live demo:** [stampatron.com](https://stampatron.com) <!-- update if URL differs -->

---

## Features

- 🚀 **WebGPU-native** — GPU compute shaders for particle simulation; no Canvas 2D or WebGL fallback
- 🎨 **Multiple effects** — Scatter, Fireworks and Vortex. More to follow in time.
- 📦 **Zero runtime dependencies**
- 🔌 **Flexible emitters** — Point, circle, and rectangle emitter types
- 🧩 **Typed API** — Full TypeScript declarations included
- ⚡ **Lightweight** — Ships as a single `.mjs` bundle with `.d.ts` declarations

---

## Requirements

- A browser with [WebGPU support](https://caniuse.com/webgpu) (Chrome 113+, Edge 113+)
- Node.js 18+ (for build tooling)

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

| Effect         | Description                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `scatter-fade` | Particles emitted from a point with gravity, fading out over their lifetime                         |
| `fireworks`    | Two-phase effect: rockets launch upward, then burst into radial sparks with motion-trail stretching |
| `vortex-fade`  | Particles spiral inward/outward around a central attractor                                          |

---

## Emitter Types

```ts
// Point emitter
{ type: 'point', position: [x, y] }

// Circle emitter — particles spawn anywhere within the radius
{ type: 'circle', position: [x, y], radius: number }

// Rect emitter — particles spawn anywhere within the bounds
{ type: 'rect', position: [x, y], width: number, height: number }
```

---

## Shader Parameters

Each effect exposes up to five generic shader parameter slots (`sp0`–`sp4`) for tuning behaviour at runtime without recompiling shaders. Refer to each effect's documentation for what each slot controls.

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
| `sp0`–`sp4`   | `f32`   | Per-effect shader parameters   |

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
└── package.json
```

### Build

```bash
npm run build
```

The build pipeline runs `tsup` (produces `.mjs`) and `tsc --emitDeclarationOnly` (produces `.d.ts`) in parallel via `concurrently`. Output is written to `dist/` and then pushed to the [`webgpu-particles-dist`](https://github.com/stamps9k/webgpu-particles-dist) repo for npm installation.

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
