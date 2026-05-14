import { ParticleEffect } from "./ParticleEffect";
import { Particle } from "../Particle";
import { ShaderParams } from "../ShaderParams";

export class FireworksEffect implements ParticleEffect {
  private MAX_PARTICLES;
  private LAUNCH_SPEED;
  private SPARK_SPEED;
  private ROCKET_COUNT;

  public constructor(max_particles: number, rocket_number: number) {
    this.MAX_PARTICLES = max_particles;
    this.ROCKET_COUNT = rocket_number;
    this.LAUNCH_SPEED = 400;
    this.SPARK_SPEED = 300;
  }

  seed_particles(): Particle[] {
    var particles: Particle[] = [];

    for (const particle of particles) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 300;

      particle.position = [0, 0]; // engine overwrites from emitter pos
      particle.velocity = [Math.cos(angle) * speed, Math.sin(angle) * speed];
      particle.color = [Math.random(), Math.random(), Math.random(), 1.0];
      particle.seed = Math.random();
      particle.maxLife = 1.0 + Math.random() * 2.0;
      particle.life = particle.maxLife;
      particle.size = 2 + Math.random() * 6;
    }

    return particles;
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
}
