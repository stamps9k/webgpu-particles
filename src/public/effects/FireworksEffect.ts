import { ParticleEffect } from "./ParticleEffect";
import { Particle } from "../Particle";
import { ShaderParams } from "../ShaderParams";
import { ParticleType } from "../enums/ParticleTypes";

export class FireworksEffect implements ParticleEffect {
  private MAX_PARTICLES;
  private LAUNCH_SPEED;
  private SPARK_SPEED;
  private ROCKET_COUNT;

  private static rules: ValidationRule<FireworksEffect>[] = [
    {
      check: (e) => e.MAX_PARTICLES > 0,
      message: "Max Particles must be greater than 0",
    },
    {
      check: (e) => e.MAX_PARTICLES <= 100000,
      message: "Max particles must not exceed 100,000",
    },
    {
      check: (e) => e.LAUNCH_SPEED < 0,
      message: "Lanuch Speed must be greater than 0",
    },
  ];

  public constructor(max_particles: number, rocket_number: number) {
    this.MAX_PARTICLES = max_particles;
    this.ROCKET_COUNT = rocket_number;
    this.LAUNCH_SPEED = 400;
    this.SPARK_SPEED = 300;
  }

  seed_particles(): Particle[] {
    return Array.from({ length: this.ROCKET_COUNT }, () => {
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
      sp0: this.LAUNCH_SPEED, // - Launch speed
      sp1: this.SPARK_SPEED, // - Spark speed
      sp2: 200, // - gravity
      sp3: this.ROCKET_COUNT, // - Rocket Count
      sp4: 0, // - Unused
    };
  }

  get_max_particles(): number {
    return this.MAX_PARTICLES;
  }

  get_effect_name(): string {
    return "fireworks";
  }

  validate(): ValidationResult {
    return validate(this, FireworksEffect.rules);
  }
}
