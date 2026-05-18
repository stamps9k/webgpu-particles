import { ParticleEffect } from "./public/effects/ParticleEffect";
import { EmitterConfig } from "./public/EmitterConfig";
import { ParticleEngine } from "./public/ParticleEngine";

/**
 * A hello world function to check library is accessable by calling website.
 *
 * @returns A string saying everything is ready
 */
export function hello_particles(): string {
  return "particles ready changed 🎆";
}

/**
 * Initiliasize the system in preparation of use. Just a wrapper for the particle engine's init function.
 *
 * @param canvas - the canvas element to tie the particles to.
 * @param max_particles - the maximum number of particles to render.
 * @param emitter_shape - the shape that particles are emitted in.
 * @param shader_set - the shader_set to use to render the particles.
 *
 * @returns A Promise to give a particles context for use by the website
 */
export function init(
  canvas: HTMLCanvasElement,
  particle_effect: ParticleEffect,
  emitter_config: EmitterConfig,
): Promise<ParticleEngine> {
  return ParticleEngine.init(canvas, particle_effect, emitter_config);
}

// #region --- Export items for use by library users ---------------------------
export { ParticleEngine } from "./public/ParticleEngine";
export { ParticleType } from "./public/enums/ParticleTypes";
export { ParticleEffect } from "./public/effects/ParticleEffect";
export { ScatterFadeEffect } from "./public/effects/ScatterFadeEffect";
export { ScatterSwirlEffect } from "./public/effects/ScatterSwirlEffect";
export { FireworksEffect } from "./public/effects/FireworksEffect";
export { EmitterConfig } from "./public/EmitterConfig";
// #endregion ------------------------------------------------------------------
