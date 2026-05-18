import { ParticleType } from "./enums/ParticleTypes";

/** Interface defining the properties for a particle as used by the GPU shader*/
export interface Particle {
  position: [number, number];
  velocity: [number, number];
  color: [number, number, number, number];
  seed: number;
  life: number;
  maxLife: number;
  size: number;
  type: ParticleType;
}
