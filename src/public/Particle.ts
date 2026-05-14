import { ParticleType } from "./enums/ParticleTypes";

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
