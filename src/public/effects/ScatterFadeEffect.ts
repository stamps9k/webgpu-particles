import { ParticleEffect } from "./ParticleEffect";
import { Particle } from "../Particle";
import { ShaderParams } from "../ShaderParams";
import { ParticleType } from "../enums/ParticleTypes";

export class ScatterFadeEffect implements ParticleEffect {
  private MAX_PARTICLES;

  private static rules: ValidationRule<ScatterFadeEffect>[] = [
    {
      check: (e) => e.MAX_PARTICLES > 0,
      message: "Max Particles must be greater than 0",
    },
    {
      check: (e) => e.MAX_PARTICLES <= 100000,
      message: "Max particles must not exceed 100,000",
    },
  ];

  public constructor(max_particles: number) {
    this.MAX_PARTICLES = max_particles;
  }

  seed_particles(): Particle[] {
    return Array.from({ length: this.MAX_PARTICLES }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 300;

      return {
        position: [0, 0],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: [Math.random(), Math.random(), Math.random(), 1.0],
        seed: Math.random(),
        maxLife: 1.0 + Math.random() * 2.0,
        life: 1.0 + Math.random() * 2.0,
        size: 2 + Math.random() * 6,
        type: ParticleType.Square,
      };
    });
  }

  get_shader_params(): ShaderParams {
    return { sp0: 0, sp1: 0, sp2: 0, sp3: 0, sp4: 0 };
  }

  get_max_particles(): number {
    return this.MAX_PARTICLES;
  }

  get_effect_name(): string {
    return "scatter-fade";
  }

  validate(): ValidationResult {
    return validate(this, ScatterFadeEffect.rules);
  }
}
