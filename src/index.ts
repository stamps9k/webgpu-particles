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
 * Initiliasize the system in preparation of use
 * 
 * @param canvas - the canvas element to tie the particles to.
 * @param max_particles - the maximum number of particles to render.
 * 
 * @returns A Promise to give a particles context for use by the website  
 */
export function init(canvas: HTMLCanvasElement, max_particles: number = 10000): Promise<ParticleEngine> {
  return ParticleEngine.init(canvas, max_particles);
} 

export { ParticleEngine } from './public/ParticleEngine';
export { ParticleType } from './public/enums/ParticleTypes';