import { ParticleEffect } from "./ParticleEffect";
import { Particle } from "../Particle";
import { ShaderParams } from "../ShaderParams";
import { ParticleType } from "../enums/ParticleTypes";
import { validate, ValidationRule } from "../types/ValidationRule";

/**
 *
 * A class Representing the ScatterSwirl particle effect
 *
 */
export class ScatterSwirlEffect implements ParticleEffect {
  // #region --- The class properties ------------------------------------------
  private MAX_PARTICLES;
  private SPIN_STRENGTH;
  private PULL_STRENGTH;
  private ping_pong = false;
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
  // #endregion ----------------------------------------------------------------

  /**
   * The class constructor. Takes the user definable properties and returns an instance of the class
   *
   * @param max_particles - The max number of particles for the effect
   */
  public constructor(max_particles: number) {
    this.MAX_PARTICLES = max_particles;
    this.SPIN_STRENGTH = 150;
    this.PULL_STRENGTH = 30;
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
    return {
      sp0: this.SPIN_STRENGTH, // - spin strength
      sp1: this.PULL_STRENGTH, // - pull strength
      sp2: 0, // - Unused
      sp3: 0, // - Unused
      sp4: 0, // - Unused
      sp5: 0, // - Unused
      sp6: 0, // - Unused
      sp7: 0, // - Unused
      sp8: 0, // - Unused
      sp9: 0, // - Unused
      sp10: 0, // - Unused
    };
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
    return "scatter-swirl";
  }

  /**
   * Validate the object properties
   *
   * @returns
   */
  validate(): ValidationResult {
    return validate(this, ScatterSwirlEffect.rules);
  }
}
