import { ParticleEffect } from "./ParticleEffect";
import { Particle } from "../Particle";
import { ShaderParams } from "../ShaderParams";
import { ParticleType } from "../enums/ParticleTypes";
import { validate, ValidationRule } from "../types/ValidationRule";

export class ScatterSwirlEffect implements ParticleEffect {
  private MAX_PARTICLES;
  private SPIN_STRENGTH;
  private PULL_STRENGTH;

  private static rules: ValidationRule<ScatterSwirlEffect>[] = [
    {
      check: (e) => e.MAX_PARTICLES > 0,
      message: "Max Particles must be greater than 0",
    },
    {
      check: (e) => e.MAX_PARTICLES <= 100000,
      message: "Max particles must not exceed 100,000",
    },
    {
      check: (e) => e.SPIN_STRENGTH > 0,
      message: "Spin strength must be greater than 0",
    },
    {
      check: (e) => e.PULL_STRENGTH > 0,
      message: "Pull strength must be greater than 0",
    },
  ];

  public constructor(max_particles: number) {
    this.MAX_PARTICLES = max_particles;
    this.SPIN_STRENGTH = 150;
    this.PULL_STRENGTH = 30;
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
    return {
      sp0: this.SPIN_STRENGTH, // - spin strength
      sp1: this.PULL_STRENGTH, // - pull strength
      sp2: 0,
      sp3: 0,
      sp4: 0,
    };
  }

  get_max_particles(): number {
    return this.MAX_PARTICLES;
  }

  get_effect_name(): string {
    return "scatter-swirl";
  }

  validate(): ValidationResult {
    return validate(this, ScatterSwirlEffect.rules);
  }
}
