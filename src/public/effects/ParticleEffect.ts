import { Particle } from "../Particle";
import { ShaderParams } from "../ShaderParams";

export interface ParticleEffect {
  seed_particles(): Particle[];
  get_shader_params(): ShaderParams; // sp0–sp4
  get_max_particles(): number;
  get_effect_name(): string;
  validate(): ValidationResult;
}
