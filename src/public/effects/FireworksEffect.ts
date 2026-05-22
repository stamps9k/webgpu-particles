import { ParticleEffect } from "./ParticleEffect";
import { Particle } from "../Particle";
import { ShaderParams } from "../ShaderParams";
import { ParticleType } from "../enums/ParticleTypes";
import { ValidationRule, validate } from "../types/ValidationRule";

/**
 *
 * A class Representing the fireworks particle effect
 *
 */
export class FireworksEffect implements ParticleEffect {
  // #region --- The class properties ------------------------------------------
  private MAX_PARTICLES;
  private LAUNCH_SPEED;
  private SPARK_SPEED;
  private ROCKET_COUNT;
  private ping_pong = false;

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
      check: (e) => e.ROCKET_COUNT <= e.MAX_PARTICLES / 2,
      message: "Rocket count must not exceed 1/2 the max particles",
    },
    {
      check: (e) => e.LAUNCH_SPEED > 0,
      message: "Lanuch Speed must be greater than 0",
    },
  ];
  // #endregion ----------------------------------------------------------------

  /**
   * The class constructor. Takes the user definable properties and returns an instance of the class
   *
   * @param max_particles - The max number of particles for the effect
   * @param rocket_number - The max number of rockets for the effect
   */
  public constructor(max_particles: number, rocket_number: number) {
    this.MAX_PARTICLES = max_particles;
    this.ROCKET_COUNT = rocket_number;
    this.LAUNCH_SPEED = 400;
    this.SPARK_SPEED = 300;
  }

  /**
   * Generate all the particles for the intial buffering of the cpu.
   *
   * @returns - An array of particles with random initial values
   *
   */
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

  /**
   * Get the various custom shader particle parameters
   *
   * @returns an object representing the custom shader params.
   */
  get_shader_params(): ShaderParams {
    return {
      sp0: this.LAUNCH_SPEED, // - Launch speed
      sp1: this.SPARK_SPEED, // - Spark speed
      sp2: 200, // - gravity
      sp3: this.ROCKET_COUNT, // - Rocket Count
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
    return "fireworks";
  }

  /**
   * Validate the object properties
   *
   * @returns
   */
  validate(): ValidationResult {
    return validate(this, FireworksEffect.rules);
  }
}
