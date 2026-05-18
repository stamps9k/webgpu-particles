import { Particle } from "../Particle";
import { ShaderParams } from "../ShaderParams";

/** Interface exposing standard functions that all Particle Effects must implement */
export interface ParticleEffect {
  seed_particles(): Particle[];
  get_shader_params(): ShaderParams; // sp0–sp4
  get_max_particles(): number;
  get_effect_name(): string;
  validate(): ValidationResult;
}
