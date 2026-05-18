import { ParticleEffect } from "./ParticleEffect";
import { Particle } from "../Particle";
import { ShaderParams } from "../ShaderParams";
import { ParticleType } from "../enums/ParticleTypes";
import { ValidationRule, validate } from "../types/ValidationRule";

/**
 *
 * A class Representing the ScatterFade particle effect
 *
 */
export class ScatterFadeEffect implements ParticleEffect {
  // #region --- The class properties ------------------------------------------
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
  // #endregion ----------------------------------------------------------------

  /**
   * The class constructor. Takes the user definable properties and returns an instance of the class
   *
   * @param max_particles - The max number of particles for the effect
   * @param rocket_number - The max number of rockets for the effect
   */
  public constructor(max_particles: number) {
    this.MAX_PARTICLES = max_particles;
  }

  /**
   * Generate all the particles for the intial buffering of the cpu.
   *
   * @returns - An array of particles with random initial values
   *
   */
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

  /**
   * Get the various custom shader particle parameters
   *
   * @returns an object representing the custom shader params.
   */
  get_shader_params(): ShaderParams {
    //This shader has no custom parameters
    return { sp0: 0, sp1: 0, sp2: 0, sp3: 0, sp4: 0 };
  }

  /**
   * Getter for the max_particles property.
   *
   * @returns - the maximum number of particles for the effect.
   */
  get_max_particles(): number {
    return this.MAX_PARTICLES;
  }

  /**
   * Fetch the name of the effect as a string
   *
   */
  get_effect_name(): string {
    return "scatter-fade";
  }

  /**
   * Validate the object properties
   *
   * @returns
   */
  validate(): ValidationResult {
    return validate(this, ScatterFadeEffect.rules);
  }
}
